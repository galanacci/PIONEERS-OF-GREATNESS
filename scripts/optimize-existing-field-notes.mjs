import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";
import { validateFieldNotes } from "./validate-content.mjs";

const archivePath = "data/field-notes.json";
const sourceRoot = join("src", "field-notes");
const originalArchiveRoot = process.env.FIELD_NOTES_ORIGINAL_ARCHIVE;

if (!originalArchiveRoot) {
    throw new Error("FIELD_NOTES_ORIGINAL_ARCHIVE must point to a directory outside the deployed repository.");
}

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
    }));
    return nested.flat();
}

const payload = JSON.parse(await readFile(archivePath, "utf8"));
const files = (await walk(sourceRoot)).filter((path) => /\.(jpe?g|png|webp)$/i.test(path));
const replacements = new Map();

for (const source of files) {
    const relativePath = relative(sourceRoot, source);
    const archived = join(originalArchiveRoot, relativePath);
    await mkdir(dirname(archived), { recursive: true });
    try {
        await stat(archived);
    } catch {
        await copyFile(source, archived);
    }

    const output = join(dirname(source), `${basename(source, extname(source))}.webp`);
    if (source !== output) {
        await sharp(source)
            .rotate()
            .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82, effort: 5 })
            .toFile(output);
    }
    replacements.set(source.replaceAll("\\", "/"), output.replaceAll("\\", "/"));
}

payload.notes.forEach((note) => {
    note.images = note.images.map((path) => replacements.get(path) || path);
});
await validateFieldNotes(payload);
await writeFile(archivePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Optimized ${files.length} Field Notes assets; originals archived at ${originalArchiveRoot}.`);
