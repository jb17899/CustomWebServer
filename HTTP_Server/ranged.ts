import * as fs from 'fs/promises';
import * as contentLen from './contentLen';
export type HttpRange = [number, number | null] | number;

export function parseByteRanges(buf: null | Buffer[]): HttpRange[] {
    if (buf === null) {
        throw new Error("empty header field...");
    }

    const prefix = "Content-Range:";
    let ansVal = "";

    for (const c of buf) {
        const str = c.toString("latin1"); 
        if (str.startsWith(prefix)) {
            ansVal = str.slice(prefix.length).trim();
            break;
        }
    }
    if (!ansVal) {
        throw new Error("Content-Range header not found.");
    }

    const parts = ansVal.split(/\s+/);
    const htRange: HttpRange[] = [];

    for (const part of parts) {
        if (part.includes("-")) {
            const [startStr, endStr] = part.split("-");
            const start = Number(startStr);
            const end = endStr === "" ? null : Number(endStr);
            if (isNaN(start)) throw new Error(`Invalid start value in range: ${part}`);
            htRange.push(end === null || isNaN(end) ? [start, null] : [start, end]);
        } else {
            const num = Number(part);
            if (isNaN(num)) throw new Error(`Invalid number in range: ${part}`);
            htRange.push(num);
        }
    }
    return htRange;
}
export async function readerFromStaticFile(fp:fs.FileHandle,start:number,end:number):Promise<contentLen.bodyType>{
    let got = 0;
    const buf = Buffer.allocUnsafe(65536);
    return {
        len:end - start ,
        read:async():Promise<Buffer>=>{
            const remaining = end - start;
            if (remaining <= 0) {
                return Buffer.alloc(0);
            }
            const maxRead = Math.min(buf.length, remaining);
            const r = await fp.read({buffer:buf,position:start,length:maxRead});
            got += r.bytesRead;
            start += r.bytesRead;
            if (got > (end - start + r.bytesRead) || (got < (end - start + r.bytesRead) && r.bytesRead === 0)) {
                throw new Error("file size changed abandon it....");
            }
            return r.buffer.subarray(0, r.bytesRead);
        },
        close:async():Promise<void>=>{
            got = 0;
            await fp.close();
        }
    };
}