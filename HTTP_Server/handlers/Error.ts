class Err extends Error{
    code:number;
    constructor(message:string,code:number){
        super(message);
        this.message = message;
        this.code = code;
    }
}
function HTTPError(code:number,message:string){
    const err = new Err(message,code);
    throw err;
}
export default HTTPError;