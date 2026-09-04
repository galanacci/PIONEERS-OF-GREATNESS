import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".mp4": "video/mp4", ".png": "image/png", ".webp": "image/webp" };

createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
        const relative = normalize(pathname === "/" ? "index.html" : pathname.slice(1));
        if (relative.startsWith("..")) throw new Error("Invalid path");
        const path = join(root, relative);
        const info = await stat(path);
        if (!info.isFile()) throw new Error("Not a file");
        response.writeHead(200, { "Content-Type": types[extname(path).toLowerCase()] || "application/octet-stream" });
        createReadStream(path).pipe(response);
    } catch {
        response.writeHead(404); response.end("Not found");
    }
}).listen(4173, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:4173"));
