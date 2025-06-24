import * as fs from "fs/promises";
export async function getLastModified(paths:string):Promise<Date>{
    const val = await fs.stat(paths);
    console.log(val.mtime);
    return val.mtime;
}