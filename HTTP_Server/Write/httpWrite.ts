import * as  eventPromise  from '../../TCP_echo/eventPromises';
import * as types from '../handlers/types';
async function httpWrite(conn:eventPromise.TCPconn,res:types.httpRes):Promise<void>{
    if(res.body.len<0){
        res.headers.push(Buffer.from('Transfer-Encoding:chunked'));
    }
    else{
        res.headers.push(Buffer.from(`Content-Length:${res.body.len}`));
    }
    for(let c of res.headers){
        console.log(c.toString());
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
function encodeHTTPRes(res: types.httpRes): Buffer {
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
export {httpWrite};