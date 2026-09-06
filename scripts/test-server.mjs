import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const ROOT = process.cwd();
const PORT = 4173;
const TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".webp": "image/webp"
};

createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = resolve(ROOT, requested);
    if (file !== ROOT && !file.startsWith(`${ROOT}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
    }
    try {
        if (!(await stat(file)).isFile()) throw new Error("Not a file");
        response.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end("Not found");
    }
}).listen(PORT, "127.0.0.1");
