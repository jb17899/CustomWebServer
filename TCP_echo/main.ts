import * as net from 'net';

function onConn(socket: net.Socket): void {
    console.log("new connection:"+socket.remoteAddress+","+socket.remotePort);
    socket.on('end',()=>{
        console.log("EOF");
    })
    socket.on('data',(data:Buffer)=>{
        console.log(data);
        socket.write(data);
        if(data.includes('q')){
            console.log("closing\n");
            socket.end();
        }
    })
}
let server = net.createServer({allowHalfOpen:true});
server.on('connection',onConn);
server.listen({host:"127.0.0.1",port:"5432"});



