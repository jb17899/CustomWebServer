import HTTPError from '../handlers/Error';
import * as eventPromise from '../../TCP_echo/eventPromises';
import * as practice from '../../TCP_echo/practice';
import * as types from '../handlers/types';
import { fieldGet } from '../handlers/getFields';


async function *readChunks(conn:eventPromise.TCPconn,buf:practice.DynBuf):types.bufferGen{
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
function parseDec(val:string):number{
    return parseInt(val,10);
}
function getHttpBody(conn:eventPromise.TCPconn,buf:practice.DynBuf,req:types.httpReq):types.bodyType{
    let bodyLen:number = -1;
    const contentLen:null|Buffer = fieldGet(req.headers,'Content-Length');
    if(contentLen){
        bodyLen = parseDec(contentLen.toString('latin1'));
        console.log(`Content-Length: ${bodyLen}`);
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
function readerFromConnLen(conn:eventPromise.TCPconn,buf:practice.DynBuf,bodyLen:number):types.bodyType{
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
export { getHttpBody};