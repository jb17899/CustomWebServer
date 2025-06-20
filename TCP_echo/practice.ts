import * as net from 'net';
import * as eventPromise from './eventPromises';
export type DynBuf = {
    buffer:Buffer,
    length:number
};
export function pushBuffer(dynBuf:DynBuf,data:Buffer):void{
    const newLen = dynBuf.length+data.length;
    if(newLen>dynBuf.buffer.length){
        let cap = Math.max(dynBuf.buffer.length,32);
        while(cap<newLen){
            cap*=2;
        }
        const grown = Buffer.alloc(cap,0);
        dynBuf.buffer.copy(grown,0,0);
        dynBuf.buffer = grown;
    }
    data.copy(dynBuf.buffer,dynBuf.length,0);
    dynBuf.length = newLen;
}
export async function serveClient(socket:net.Socket):Promise<void>{
    const connection = eventPromise.soInit(socket);
    var dynBuf = {buffer:Buffer.alloc(0),length:0};
    while(true){
        const msg:null|Buffer = cutMessage(dynBuf);     //tells function if message is complete.Returns null if not;
        if(!msg){
            const data:Buffer = await eventPromise.soRead(connection);
            pushBuffer(dynBuf,data);
            if(data.length == 0){
                console.log("connection completed\n");
                return;
            }
            continue;
        }
        if(msg.equals(Buffer.from('quits\n'))){
            await eventPromise.soWrite(connection,Buffer.from("Bye\n"));
            socket.destroy();
            return;
        }
        else {
            const reply:Buffer = Buffer.concat([Buffer.from('Echo: '),msg]);
            await eventPromise.soWrite(connection,reply);
        }
    } 
}
function cutMessage(dynBuf:DynBuf):null|Buffer{
    let idx = dynBuf.buffer.subarray(0,dynBuf.length).indexOf('\n');
    if(idx<0){
        return null;
    }
    const newBuf = Buffer.from(dynBuf.buffer.subarray(0,idx+1));
    BufPop(dynBuf,idx+1);
    return newBuf;
}
export function BufPop(buf:DynBuf,len:number):void{                   //fix O(n2)behaviour
    buf.buffer.copyWithin(0,len,buf.length);
    buf.length-=len;
}