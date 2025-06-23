import * as fs from 'fs/promises';
import * as contentLen from "./contentLen"
import * as range from "./ranged";
// interfaces used.
// interface fileResult{
//     bytesRead:number;
//     buf:Buffer
// };
// interface fileReadOptions{
//     buf?:Buffer;
//     offset?:number | null;
//     length?:number |null;
//     position?:number | null;
// };
// interface fileStats{
//     isFile():boolean,
//     isDirectory():boolean,
//     size:number
// };
// interface FileHandle{
//     read(options:fileReadOptions):Promise<fileResult>,
//     close():Promise<void>,
//     stat():Promise<fileStats>
// };
export async function serverStaticFile(path:string,ranged:boolean,headers:Buffer[]):Promise<contentLen.httpRes>{
    let fp:null|fs.FileHandle = null;
    try{
        let httpBody: contentLen.bodyType | undefined = undefined;
        fp = await fs.open(path,'r');
        const stat = await fp.stat();
        if(!stat.isFile()){
            throw new contentLen.HTTPError(404,"not a regular file");
        }
        const size = stat.size;
        if(ranged){
            const val:range.HttpRange[] = range.parseByteRanges(headers);
            for(let c of val){
                const start = c[0];
                let end = c[1];
                if(end === null){
                    end = size;
                }
                console.log(start,end);
                httpBody = await range.readerFromStaticFile(fp,start,end);
                break;
            }
        }
        else{
            console.log(1);
            httpBody = await readerFromStaticFile(fp,size);
        }
        if (!httpBody) {
            throw new contentLen.HTTPError(416, "No valid range or file to serve");
        }
        fp = null;
        return {
            code:200,
            headers:[],
            body:httpBody
        };
    }
    catch(exc){
        console.log("Error"+exc);
        throw new contentLen.HTTPError(404,"File not found");
    }
    finally{
        fp?.close();
    }
}
async function readerFromStaticFile(fp:fs.FileHandle,size:number):Promise<contentLen.bodyType>{
    let got = 0;
    const buf = Buffer.allocUnsafe(65536);
    return {
        len:size,
        read:async():Promise<Buffer>=>{
            const r = await fp.read({buffer:buf});
            got+=r.bytesRead;
            if(got>size || (got<size&&r.bytesRead == 0)){
                throw new Error("file size changed abandon it....");
            }
            return r.buffer.subarray(0,r.bytesRead);
        },
        close:async():Promise<void>=>{
            await fp.close();
        }
    };
}
