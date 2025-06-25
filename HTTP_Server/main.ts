import * as net from 'net';
import * as eventPromise from '../TCP_echo/eventPromises';
import * as practice from '../TCP_echo/practice';
import * as types from './handlers/types';
import dotenv from "dotenv";
import {httpWrite} from './Write/httpWrite';
import * as check from './handlers/checkNull';
import HTTPError from './handlers/Error';
import {getHttpBody} from './Read/bodyHandle';
import {handleReq} from './Read/reqHandle';
dotenv.config();

async function newConn(socket:net.Socket):Promise<void>{
    const conn = eventPromise.soInit(socket);
    try{
        await serveClient(conn);
    }
    catch(exc){
        const sendVal:types.httpRes = {
            code:exc.code,
            headers:[],
            body:readerFromMemory(Buffer.from(exc.message)),   
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

async function serveClient(conn:eventPromise.TCPconn):Promise<void>{
    const buf:practice.DynBuf = {buffer:Buffer.alloc(0),length:0};
    while(true){
        const msg:null|types.httpReq = check.cutMessage(buf);
        if(!msg){
            const data = await eventPromise.soRead(conn);
            console.log(data);
            practice.pushBuffer(buf,data);
            if(data.length == 0 && buf.length == 0){
                return;
            }
            else if(data.length == 0){
                throw new HTTPError(400,'Unexpected EOF');
            }
            continue;
        }
        const bodyReq:types.bodyType|null = await getHttpBody(conn,buf,msg);
        const res:types.httpRes = await handleReq(msg);
        res.headers.push(Buffer.from(`Last-Modified:${res.time}`));
        try{
        await httpWrite(conn,res);
        if(msg.version == '1.0'){
            return;
        }

        await res.body.close();
        while ((await bodyReq!.read()).length > 0) {}
        }finally{
            res.body.close?.();
        }
    }
}
export function readerFromMemory(buf:Buffer):types.bodyType{
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

let server = net.createServer({allowHalfOpen:true});
server.on('connection',newConn);
server.listen({host:"127.0.0.1",port:"5432"});
