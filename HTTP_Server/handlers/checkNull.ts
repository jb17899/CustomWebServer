import * as practice from '../../TCP_echo/practice';
import * as types from './types';
import HTTPError from './Error';

const maxLen = 8*1024;
function cutMessage(buf:practice.DynBuf):null|types.httpReq{
    let idx = (buf.buffer.subarray(0,buf.length)).indexOf('\r\n\r\n');
    if(idx<0){
        if(buf.length >= maxLen){
            throw new HTTPError(400,'Header is too large');
        }
        return null;
    }
    const msg:types.httpReq = parseHttpReq(buf.buffer.subarray(0,idx+4));
    practice.BufPop(buf,idx+4);
    return msg;
}
function parseHttpReq(buf:Buffer):types.httpReq{
    const lines:Buffer[] = parseLines(buf);let ranged = false;
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
    var headers:Buffer[] = [];let timeReq:types.lastModified = {lastReq:false,clientVal:""};
    const prefix:Buffer = Buffer.from("Content-Range");let len = prefix.length;const timed:Buffer = Buffer.from("If-Modified-Since");
    for(let i = index+1;i<lines.length-1;i++){
        let h:Buffer = lines[i];
        if(!validateHeader(h)){
            throw new HTTPError(400,'Header field could not be validated......');
        }
        if(h.subarray(0,len).equals(prefix)){
            ranged = true;
        }
        if(h.subarray(0,timed.length).equals(timed)){
            timeReq.lastReq = true;
            timeReq.clientVal = h.subarray(timed.length+1).toString();
        }
        headers.push(h);
    }
    return {
        method:method,uri:uri,version:version,headers:headers,timed:timeReq,ranged:ranged
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
export {cutMessage};