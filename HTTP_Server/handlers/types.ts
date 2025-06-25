type httpReq = {
    method:string,
    uri:Buffer,               //no guarenttee that they must be ascii or utf-8 string
    version:string,
    headers:Buffer[],
    timed?:lastModified,
    ranged?:boolean,
    compressed?:toCompress
};
type httpRes = {
    code:number,
    headers:Buffer[],
    body:bodyType,
    time?:Date
};
 type bodyType = {
    len:number,
    read:()=>Promise<Buffer>,
    close:()=>Promise<void>
};

type HttpRange = [number, number | null] | number;
type bufferGen = AsyncGenerator<Buffer,void,void>;
type lastModified ={
    lastReq:Boolean,
    clientVal:string
};
type toCompress={
    compressed:boolean,
    encoding:Array<string>,
    type?:string
};

export {httpReq,httpRes,bodyType,HttpRange,bufferGen,lastModified,toCompress};