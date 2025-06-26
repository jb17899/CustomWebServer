# My Custom HTTP Server

A lightweight, custom-built HTTP server in Node.js that:
- Serves static files securely (with directory traversal protection)
- Supports streaming responses using async generators
- Handles conditional requests (Last-Modified, 301 redirect)
- Provides optional compression and range support
- Demonstrates manual HTTP handling without external frameworks (like Express)

## Features

✅ Secure static file serving  
✅ Streaming generator-based responses (`/echo`)  
✅ Directory traversal protection  
✅ Compression-aware response handling  
✅ Conditional GET with Last-Modified checks  
✅ has got GET,POST,HEAD
✅ Simple cache integration  
✅ Custom Error Handling
✅ Added support for ranged requests
---

## Example Routes

| Route | Description |
|--------|-------------|
| `/echo` | Streams numbers (e.g., 0, 100, 200, ..., 900) in chunks Built it for sending data in chunks|
| `/path/to/file` | Serves static file if exists and permitted |
| `/bundle.js` | (If implemented) Serves combined JS files |
| `/bundle.css` | (If implemented) Serves combined CSS files |
`You can build your own routes and paths by modifying path.ts file and adding to files fields.`

- chunked data format has been implemented only to send numbers using generators.If you want you can modify it to send data only in chunked format.
---

## How to Run

```bash
# Install dependencies
npm install

# Run the server
node your-server-file.js
Development Notes
Written using Node.js core modules (http, fs, path, stream, zlib)

No Express or external web frameworks

Uses dotenv for environment configuration (e.g. HOME_DIRECTORY)
--
## for .env
Put-.

HOME_DIRECTORY=/path/to/your/public/files

## Future Enhancements
Add ETag support
Add logging middleware
Improve MIME type detection
Add HTTPS support

Also has 






