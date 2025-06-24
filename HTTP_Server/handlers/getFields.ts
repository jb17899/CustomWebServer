import  HTTPError  from './Error';
function fieldGet(header:Buffer[],val:string):null|Buffer{
    var vals:Buffer = Buffer.from(val);

    for(let c of header){
        var idx = c.indexOf(':');
        if(idx<0){
            throw new HTTPError(400,'Bad header fields');
        }
        if(c.subarray(0,idx).equals(vals)){
            const ans = c.subarray(idx+2,c.length);
            return Buffer.from(ans);
        }
    }
    return null;
}
export { fieldGet };