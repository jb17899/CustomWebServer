//generators to satisfy producer consumer problem here
import * as content from "./contentLen";

type bufferGen = AsyncGenerator<Buffer,void,void>

async function *countSheep():bufferGen{
    for(let c=0;c<10;c++){
        await new Promise((resolve)=>{setTimeout(resolve,1000)});
        yield  Buffer.from(`${c}\n`);
    }
}
