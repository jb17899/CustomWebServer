//Write your own paths here
//you can write your own logic here in case of ejs
function get(request:string):string{
    if (request === "/") {
        return "first/index.html";
    } else if (request === "/about") {
        return "about.html";
    } else if (request === "/Developers") {
        return "developers.html";
    }
    else if (request === "/contact") {
        return "contact.html";
    }
    else if (request === "/favicon.ico") {
        return "favicon.ico";
    }
    else if(request === "/val.css"){
        return "first/val.css";
    }
    else if(request === "/newLook.js"){
        return "first/newLook.js";
    }
    else{
        return "404.html"; 
    }
}
export { get };