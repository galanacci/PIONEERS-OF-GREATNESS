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
    ".mp3": "audio/mpeg",
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
        const info = await stat(file);
        if (!info.isFile()) throw new Error("Not a file");
        const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
        const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        if (range) {
            const start = Number(range[1]);
            const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
            if (start > end || start >= info.size) {
                response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
                return;
            }
            response.writeHead(206, {
                "Accept-Ranges": "bytes",
                "Content-Range": `bytes ${start}-${end}/${info.size}`,
                "Content-Length": end - start + 1,
                "Content-Type": type
            });
            createReadStream(file, { start, end }).pipe(response);
            return;
        }
        response.writeHead(200, {
            "Accept-Ranges": "bytes",
            "Content-Length": info.size,
            "Content-Type": type
        });
        createReadStream(file).pipe(response);
    } catch {
        response.writeHead(404).end("Not found");
    }
}).listen(PORT, "127.0.0.1");
