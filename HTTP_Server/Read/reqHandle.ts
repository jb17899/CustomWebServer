import * as contentLen from '../main';
import * as types from '../handlers/types';
import * as path from 'path';
import * as cache from '../Cache/cache';
import * as fileHandling from './fileHandling';
import  HTTPError  from '../handlers/Error';
import dotenv from 'dotenv';
import {get} from './paths';
dotenv.config();
async function *countSheep():types.bufferGen{                              //implement freeing memory from here instead of GC.Could use return block to trigger finally block.
    try{
    for(let c=0;c<10;c++){
        await new Promise((resolve)=>{setTimeout(resolve,1)});
        yield  Buffer.from(`${c*100}\n`);
    }
}
//finally will not work in this case as using yield.so try using return.maybe will trigger finally.
finally{
    console.log("cleanup");                                           
}

}
function readerFromGen(gen:types.bufferGen):types.bodyType{
    return {
        len:-1,
        read:async():Promise<Buffer>=>{
            const r = await gen.next();
            if(r.done){
                return Buffer.from('');
            }
            else{
                console.assert(r.value.length>0);
                return r.value;
            }
        },
        close:async()=>{
            console.log("not needed");
        }
    };
}
async function handleReq(req:types.httpReq):Promise<types.httpRes>{
    let resp:types.bodyType = contentLen.readerFromMemory(Buffer.from("")); // Default empty body
    const uri = req.uri.toString('latin1');
    if(uri == '/echo'){
        resp = readerFromGen(countSheep());
    }
    else{
        if (uri === '/.well-known/appspecific/com.chrome.devtools.json'){
            throw new HTTPError(404,"Not Found");
        }
        console.log("Request URI:" + uri.toString());
        if(uri.startsWith("../")){
            throw new Error("Directory traversal attempt");
        }
        let paths =process.env.HOME_DIRECTORY+path.dirname(uri);
        if(paths.endsWith('/')){
            paths = paths.slice(0,-1);
        }
        paths = path.join(paths,get(uri));
        if(get(uri) === undefined){
            throw new HTTPError(404,"Not Found");
        }
        if(req.timed?.lastReq!==false){
        const num = (await cache.getLastModified(paths)).toString();
        if(num === req.timed?.clientVal){
            throw new HTTPError(301,"");
        }
        }
        if(req.compressed!==null&&req.compressed?.compressed == true){
            const val = get(uri);
            if(val.endsWith('.html')){
                req.compressed.type = "text/html";
            }
            else if(val.endsWith('.css')){
                req.compressed.type = "text/css";
            }
            else if(val.endsWith('.js')){
                req.compressed.type = "application/javascript";
            }
            else if(val.endsWith('.json')){
                req.compressed.type = "application/json";
            }
            else if(val.endsWith('.txt')){
                req.compressed.type = "text/plain";
            }
            else if(val.endsWith('.ico')){
                req.compressed.type = "image/x-icon";
            }
            else if(val.endsWith('.jpg') || val.endsWith('.jpeg')){
                req.compressed.type = "image/jpeg"; 
            }
        }


        return fileHandling.serverStaticFile(paths,req.headers,req.ranged,req.compressed);
    }
    return {
        code:200,
        headers:[Buffer.from('Server:my_first_http_server')],
        body:resp,
    };
}
export {handleReq};