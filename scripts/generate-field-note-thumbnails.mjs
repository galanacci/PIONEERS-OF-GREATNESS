import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const payload = JSON.parse(await readFile(path.join(root, "data/field-notes.json"), "utf8"));
const notes = Array.isArray(payload.notes) ? payload.notes : [];
let generated = 0;

for (const note of notes) {
    const source = note.images?.[0];
    if (!source || /^https?:/i.test(source)) continue;
    const input = path.join(root, source);
    const output = path.join(path.dirname(input), "thumb.webp");
    try {
        const [inputInfo, outputInfo] = await Promise.all([
            stat(input),
            stat(output).catch(() => null)
        ]);
        if (outputInfo && outputInfo.mtimeMs >= inputInfo.mtimeMs) continue;
        await sharp(input)
            .rotate()
            .resize({ width: 480, height: 480, fit: "cover", withoutEnlargement: true })
            .webp({ quality: 68, effort: 5 })
            .toFile(output);
        generated += 1;
    } catch (error) {
        console.warn(`Could not generate thumbnail for ${source}:`, error.message);
    }
}

console.log(`Generated ${generated} Field Notes thumbnails.`);
