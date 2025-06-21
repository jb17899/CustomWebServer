//generators to satisfy producer consumer problem here
import * as content from "./contentLen";

type bufferGen = AsyncGenerator<Buffer,void,void>

async function *countSheep():bufferGen{
    for(let c=0;c<10;c++){
        await new Promise((resolve)=>{setTimeout(resolve,1000)});
        yield  Buffer.from(`${c}\n`);
    }
}
function readerFromGen(gen:bufferGen):content.bodyType{
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
        }
    };
}
