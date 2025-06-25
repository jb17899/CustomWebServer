import * as zlib from 'zlib';
import * as stream from 'stream';
import { pipeline } from 'stream/promises';  // still imported if you need it elsewhere
import * as types from './handlers/types';
import HTTPError from './handlers/Error';

/**
 * Enable compression on the HTTP body if gzip is supported.
 */
function enableCompression(compressed: types.toCompress, httpBody: types.bodyType): types.bodyType {
    const codecs: string[] = compressed.encoding;
    console.log(codecs);
    if (!codecs.includes("gzip")) {
        throw new HTTPError(406, "Encoding not supported");
    }
    const compressedBody = gzipFilter(httpBody);
    console.log(compressedBody);
    return compressedBody;
}

/**
 * Wraps the httpBody in a gzip compression stream.
 */
function gzipFilter(reader: types.bodyType): types.bodyType {
    const gz = zlib.createGzip();
    const input: stream.Readable = body2Stream(reader);

    input.pipe(gz).on('error', (err) => {
        gz.destroy(err);
    });

    const iter: AsyncIterator<Buffer> = gz[Symbol.asyncIterator]();

    return {
        len: -1,  // length unknown after compression
        read: async (): Promise<Buffer> => {
            const r: IteratorResult<Buffer> = await iter.next();
            return r.done ? Buffer.alloc(0) : r.value;
        },
        close: reader.close
    };
}

/**
 * Converts a bodyType reader into a Node.js Readable stream.
 */
function body2Stream(reader: types.bodyType): stream.Readable {
    const self = new stream.Readable({
        async read() {
            try {
                const data: Buffer = await reader.read();
                if (data.length === 0) {
                    self.push(null);  // Signal end of stream
                } else {
                    self.push(data);
                }
            } catch (err) {
                self.destroy(err instanceof Error ? err : new Error("IO"));
            }
        }
    });
    return self;
}

export { enableCompression };
