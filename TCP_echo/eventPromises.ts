import * as net from 'net';
export type TCPconn = {
    socket:net.Socket;
    reader:null|{
        resolve:(value:Buffer)=>void,
        reject:(reason:Error)=>void,
    };
    error:null|Error;
    ended:boolean;
};
export function soInit(socket:net.Socket):TCPconn{
    const conn:TCPconn = {
        socket:socket,reader:null,error:null,ended:false
    };
    socket.on('data',(data:Buffer)=>{
        console.assert(conn.reader);
        conn.socket.pause();
        conn.reader!.resolve(data);
        conn.reader = null;
    });
    socket.on('error',(err:Error)=>{
        conn.error = err;
        if(conn.reader){
            conn.reader.reject(err);
            conn.reader = null;
        }
    })
    socket.on('end',()=>{
        conn.ended = true;
        if(conn.reader){
            conn.reader.resolve(Buffer.from(' '));
            conn.reader = null;
        }
    })
    return conn;
}
export function soRead(conn:TCPconn):Promise<Buffer>{
    console.assert(!conn.reader);
    return new Promise((resolve,reject)=>{
        if(conn.error){
            reject(conn.error);
        }
        if(conn.ended){
            resolve(Buffer.from(' '));
        }
        conn.reader = {resolve:resolve,reject:reject};
        conn.socket.resume();
    });
}
export function soWrite(conn:TCPconn,Buffer:Buffer):Promise<void>{
    console.assert(!conn.reader);
    return new Promise((resolve,reject)=>{
        if(conn.error){
            reject(conn.error);
        }
        conn.socket.write(Buffer,(err)=>{
            if(err){
                reject(err);
            }
            else{
                resolve();
            }
        });
    });
}



// function soRead(socket:net.Socket):Promeise<Buffer>;
// function soWrite(socket:net.Socket,Buffer:Buffer):Promise<void>;

// function soRead(socket:net.Socket):Promeise<Buffer>{

// }