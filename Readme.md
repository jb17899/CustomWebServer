# My First HTTP Server

A simple HTTP/1.1 server built from scratch using Node.js TCP sockets.

✅ Supports basic HTTP request parsing  
✅ Handles GET / POST methods  
✅ Streams request and response bodies  
✅ Supports persistent connections (HTTP/1.1 keep-alive)

---

## 📌 Features

- **POST /echo**  
  Replies with the exact body sent by the client.

- **Default route**  
  Replies with `Hello World.` for any URI except `/echo`.

- **Persistent connections**  
  Handles multiple requests over the same TCP connection (HTTP/1.1).

- **Manual HTTP parsing**  
  No frameworks like Express — you parse headers, bodies, and build responses manually.

---

## 🛠 How to run

```bash
npm i
npm run start