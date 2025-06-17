import * as net from 'net';
import * as eventPromises from './eventPromises';
import * as practice from './practice';
// function onConn(socket: net.Socket): void {
//     console.log("new connection:"+socket.remoteAddress+","+socket.remotePort);
//     socket.on('end',()=>{
//         console.log("EOF");
//     })
//     socket.on('data',(data:Buffer)=>{
//         console.log(data);
//         socket.write(data);
//         if(data.includes('q')){
//             console.log("closing\n");
//             socket.end();
//         }
//     })
// }
async function serverClient(socket:net.Socket):Promise<void>{
    const conn = eventPromises.soInit(socket);
    while(true){
        let val = await eventPromises.soRead(conn);
        if(val.length==0){
            console.log("connection completed");
            break;
        }
        await eventPromises.soWrite(conn,val);
    }
    console.log("everything done\n");
}
async function newConn(socket:net.Socket):Promise<void>{
    console.log("new connection:"+socket.remoteAddress+":"+socket.remotePort);
    try{
        await practice.serveClient(socket);
    }
    catch(err){
        throw(err);
    }
    finally{
        socket.destroy();
    }
}
let server = net.createServer({allowHalfOpen:true});
server.on('connection',newConn);
server.listen({host:"127.0.0.1",port:"5432"});



