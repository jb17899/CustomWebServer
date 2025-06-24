import * as crypt from 'crypto';

function wsKeyAccept(key:Buffer):string{
    return crypt.createHash('sha1')
    .update(key).update("258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest().toString('base64');
}