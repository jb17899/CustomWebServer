export type HttpRange = [number , number|null]|number;


function parseByteRanges(buf:null|Buffer[]):HttpRange[]{
    if(buf===null){
        throw new Error("empty header field...");
    }
    let htRange:HttpRange[] = [];let val:Buffer = Buffer.from("Content-Range");
    let ansVal:Buffer = Buffer.alloc(0);
    for(let c of buf){
        if(c.subarray(0,val.length).equals(val)){
            ansVal = c.subarray(val.length+1);
            break;
        }
    }
    let st = 0;let ansm:Buffer[] = [];
    for(let idx=0;idx<ansVal.length;idx++){
        if(ansVal[idx] == 32){
            ansm.push(ansVal.subarray(st,idx));
            console.log(ansVal.subarray(st,idx).toString());
            st = idx;
        }
    }

    return htRange;
} 
let testVal:Buffer[] = [];
for(let c = 0;c<5;c++){
    testVal.push(Buffer.from("Content-Range:12-16 13-14"));
}
let ans = parseByteRanges(testVal);