import * as net from 'net';
import * as eventPromise from '../TCP_echo/eventPromises';
import * as practice from '../TCP_echo/practice';
import path from 'path';
import dotenv from "dotenv";
import { serverStaticFile } from './fileHandling';

dotenv.config();

let ranged:boolean = false;
export type httpReq = {
    method:string,
    uri:Buffer,               //no guarenttee that they must be ascii or utf-8 string
    version:string,
    headers:Buffer[]
};
export type httpRes = {
    code:number,
    headers:Buffer[],
    body:bodyType
};
export type bodyType = {
    len:number,
    read:()=>Promise<Buffer>,
    close:()=>Promise<void>
};
class Err extends Error{
    code:number;
    constructor(message:string,code:number){
        super(message);
        this.message = message;
        this.code = code;
    }
}
type bufferGen = AsyncGenerator<Buffer,void,void>

async function *countSheep():bufferGen{                              //implement freeing memory from here instead of GC.Could use return block to trigger finally block.
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
function readerFromGen(gen:bufferGen):bodyType{
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
async function newConn(socket:net.Socket):Promise<void>{
    const conn = eventPromise.soInit(socket);
    try{
        await serveClient(conn);
    }
    catch(exc){
        const sendVal:httpRes = {
            code:exc.code,
            headers:[],
            body:readerFromMemory(Buffer.from(exc.message+"\n")),   
        }
        try{
            await httpWrite(conn,sendVal);
        }
        catch(error){
            console.log(error);
        }
    }
    finally{
        socket.destroy();
    }
}
export function HTTPError(code:number,message:string){
    const err = new Err(message,code);
    throw err;
}
const maxLen = 1024*8;
async function serveClient(conn:eventPromise.TCPconn):Promise<void>{
    const buf:practice.DynBuf = {buffer:Buffer.alloc(0),length:0};
    while(true){
        const msg:null|httpReq = cutMessage(buf);
        if(!msg){
            const data = await eventPromise.soRead(conn);
            practice.pushBuffer(buf,data);
            if(data.length == 0 && buf.length == 0){
                return;
            }
            else if(data.length == 0){
                throw new HTTPError(400,'Unexpected EOF');
            }
            continue;
        }
        console.log(msg.headers.toString());
        const bodyReq:bodyType = getHttpBody(conn,buf,msg);
        const res:httpRes = await handleReq(msg,bodyReq);
        try{
        await httpWrite(conn,res);
        if(msg.version == '1.0'){
            return;
        }

        await res.body.close();
        while ((await bodyReq.read()).length > 0) {}
        }finally{
            res.body.close?.();
        }
    }
}
function readerFromMemory(buf:Buffer):bodyType{
    let done = false;
    return{
        len:buf.length,
        read:async():Promise<Buffer>=>{
            if(done){
                return Buffer.from("");
            }
            else{
                done = true;
                return buf;
            }
        },
        close:async():Promise<void>=>{
            console.log("vals");
        }
    };
}
async function handleReq(req:httpReq,httpBody:bodyType):Promise<httpRes>{
    let resp:bodyType = readerFromMemory(Buffer.from("")); // Default empty body
    const uri = req.uri.toString('latin1');
    if(uri == '/echo'){
        resp = readerFromGen(countSheep());
    }
    else{
        if(uri.startsWith("../")){
            throw new Error("Directory traversal attempt");
        }
        let paths =process.env.HOME_DIRECTORY+path.dirname(uri);
        if(uri == '/hell'){
            let val = "val.html";
            paths+=val;
        }
        else{
            throw new Error("blocked");
        }
        return serverStaticFile(paths,ranged,req.headers);
    }
    return {
        code:200,
        headers:[Buffer.from('Server:my_first_http_server')],
        body:resp
    };
}
async function httpWrite(conn:eventPromise.TCPconn,res:httpRes):Promise<void>{
    if(res.body.len<0){
        res.headers.push(Buffer.from('Transfer-Encoding:chunked'));
    }
    else{
        res.headers.push(Buffer.from(`Content-Length:${res.body.len}`));
    }
    await eventPromise.soWrite(conn,encodeHTTPRes(res));
    const crlf = Buffer.from('\r\n');
    for(let last = false;!last;){
        let data = await res.body.read();
        last = (data.length === 0);
        if(res.body.len < 0 ){
            data = Buffer.concat([Buffer.from(data.length.toString(16)),crlf,data,crlf]);
        }
        if(data.length){
            await eventPromise.soWrite(conn,data);
        }
    }
}
function encodeHTTPRes(res: httpRes): Buffer {
    const version: string = "HTTP/1.1";
    // Use a default reason phrase for the status code
    const reason = getReasonPhrase(res.code);
    const statusLine = `${version} ${res.code} ${reason}\r\n`;

    // Build headers (headers are Buffer[])
    let headerLines = "";
    for (let c = 0; c < res.headers.length; c++) {
        const h = res.headers[c];
        headerLines += h.toString('latin1') + "\r\n";
    }

    // End of headers
    headerLines += "\r\n";

    // Only serialize the head, not the body (body is streamed separately)
    const headBuf = Buffer.from(statusLine + headerLines, 'latin1');
    return headBuf;
}

// Helper function to get reason phrase for status code
function getReasonPhrase(code: number): string {
    switch (code) {
        case 200: return "OK";
        case 400: return "Bad Request";
        case 404: return "Not Found";
        case 501: return "Not Implemented";
        default: return "OK";
    }
}


function cutMessage(buf:practice.DynBuf):null|httpReq{
    let idx = (buf.buffer.subarray(0,buf.length)).indexOf('\r\n\r\n');
    if(idx<0){
        if(buf.length >= maxLen){
            throw new HTTPError(400,'Header is too large');
        }
        return null;
    }
    const msg:httpReq = parseHttpReq(buf.buffer.subarray(0,idx+4));
    practice.BufPop(buf,idx+4);
    return msg;
}
function parseHttpReq(buf:Buffer):httpReq{
    const lines:Buffer[] = parseLines(buf);
    let idx = 0,index=-1;
    for(;idx<lines.length;idx++){
        if(lines[idx].length>0){
            index = idx;
            break;
        }
    }
    if(index == -1){
        throw new Error("Fields are all empty.....");
    }
    const [method,uri,version] = parseReqLine(lines[index]);
    var headers:Buffer[] = [];
    const prefix:Buffer = Buffer.from("Content-Range");let len = prefix.length;
    for(let i = index+1;i<lines.length-1;i++){
        let h = Buffer.from(lines[i]);


        if(!validateHeader(h)){
            throw new HTTPError(400,'Header field could not be validated......');
        }
        if(h.subarray(0,len).equals(prefix)){
            ranged = true;
        }
        headers.push(h);
    }
    return {
        method:method,uri:uri,version:version,headers:headers
    };
}
function parseReqLine(line:Buffer):[string,Buffer,string]{
    let idx= 0;
    idx = line.indexOf(32);
    const method:string = line.subarray(0,idx).toString('latin1');
    let idx2 = line.subarray(idx+1,line.length).indexOf(32);
    const uri:Buffer = Buffer.from(line.subarray(idx+1,idx+idx2+1));
    let idx3 = line.subarray(idx2+idx+1,line.length).indexOf("/");
    const version:string = line.subarray(idx3+idx2+idx+2,line.length).toString('latin1');
    return [method,uri,version];
}
function parseLines(buf:Buffer):Buffer[]{
    const linedBuf:Buffer[] = [];
    var idx = 0;var val =0;

    while((val=buf.subarray(idx,buf.length).indexOf(Buffer.from('\r\n')))>=0){
        linedBuf.push(Buffer.from(buf.subarray(idx,idx+val)));
        idx = idx+val+2;
    }
    return linedBuf;
}
function validateHeader(val: Buffer) {
    const str = val.toString('latin1');
    const index = str.indexOf(':');
    if (index <= 0) {
        return false; // colon at start or missing = bad
    }
    const name = str.slice(0, index);
    // Check header name for invalid chars (optional, simple check for non-space)
    if (/\s/.test(name)) {
        return false;
    }
    return true;
}

function parseDec(val:string):number{
    return parseInt(val,10);
}
function fieldGet(header:Buffer[],val:string):null|Buffer{
    var vals:Buffer = Buffer.from(val);

    for(let c of header){
        var idx = c.indexOf(':');
        if(idx<0){
            throw new HTTPError(400,'Bad header fields');
        }
        if(c.subarray(0,idx).equals(vals)){
            const ans = c.subarray(idx+2,c.length);
            return Buffer.from(ans);
        }
    }
    return null;

}
function getHttpBody(conn:eventPromise.TCPconn,buf:practice.DynBuf,req:httpReq):bodyType{
    let bodyLen:number = -1;
    const contentLen:null|Buffer = fieldGet(req.headers,'Content-Length');
    if(contentLen){
        bodyLen = parseDec(contentLen.toString('latin1'));
        if(isNaN(bodyLen)){
            throw new HTTPError(400,'Bad content Length');
        }
    }

    const bodyAllowed = !(req.method == "GET"||req.method == 'HEAD');
    const te = fieldGet(req.headers, "Transfer-Encoding");
const chunked = te && te.toString('latin1').trim().toLowerCase() === "chunked";

    if(!bodyAllowed&&(bodyLen>0||chunked)){
        throw new HTTPError(400,'Http Body not allowed..........');
    }
    if(bodyLen>=0){
        return readerFromConnLen(conn,buf,bodyLen);
    }
    else if(chunked){
        return readerFromGen(readChunks(conn,buf));
    }
    else{
        // if(!bodyAllowed){
        //     if(req.method == "HEAD"){

        //     }
        // }
        throw new HTTPError(501,'TODO');
    }
}
async function *readChunks(conn:eventPromise.TCPconn,buf:practice.DynBuf):bufferGen{
    for(let last = false;!last;){
        let idx = buf.buffer.subarray(0,buf.length).indexOf('\r\n');
        if(idx<0){
            return;
        }
        let remain = parseInt(buf.buffer.subarray(0,idx).toString('latin1'));
        practice.BufPop(buf,idx+2);
        last = (remain == 0);
        while(remain>0){
            if(buf.length == 0){
                const data = await eventPromise.soRead(conn);
                practice.pushBuffer(buf,data);
                if(buf.length == 0){
                    throw new Error("Unexpected EOF.....");
                }
            }
            const consume = Math.min(remain, buf.length);
            const data = Buffer.from(buf.buffer.subarray(0, consume));
            practice.BufPop(buf, consume);
            remain -= consume;
            yield data;
        }


    }

}
function readerFromConnLen(conn:eventPromise.TCPconn,buf:practice.DynBuf,bodyLen:number):bodyType{
    return {
        len:bodyLen,
        read:async():Promise<Buffer>=>{
            if(bodyLen == 0){
                return Buffer.from("");
            }
            if(buf.length == 0){
                const data = await eventPromise.soRead(conn);
                practice.pushBuffer(buf,data);
                if(buf.length == 0){
                    throw new Error("Unexpected EOF.....");
                }
            }
            const consume = Math.min(bodyLen,buf.length);
            bodyLen-=consume;
            const data = Buffer.from(buf.buffer.subarray(0,consume));
            practice.BufPop(buf,consume);
            return data;
        },
        close:async():Promise<void>=>{
            console.log(98);
        }
    }
}
let server = net.createServer({allowHalfOpen:true});
server.on('connection',newConn);
server.listen({host:"127.0.0.1",port:"5432"});
