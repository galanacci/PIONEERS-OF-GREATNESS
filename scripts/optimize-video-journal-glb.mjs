import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/optimize-video-journal-glb.mjs <input.glb> <output.glb>");
}

const source = await fs.readFile(inputPath);
const jsonLength = source.readUInt32LE(12);
const jsonType = source.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error("The GLB does not contain a JSON chunk first.");

const document = JSON.parse(source.subarray(20, 20 + jsonLength).toString().replace(/\0+$/, ""));
const binaryHeaderOffset = 20 + jsonLength;
const binaryLength = source.readUInt32LE(binaryHeaderOffset);
const binaryType = source.readUInt32LE(binaryHeaderOffset + 4);
if (binaryType !== 0x004e4942) throw new Error("The GLB does not contain a binary chunk.");
const binary = source.subarray(binaryHeaderOffset + 8, binaryHeaderOffset + 8 + binaryLength);

const largestEmbeddedImage = (document.images || [])
    .map((image, index) => ({ index, image, view: document.bufferViews[image.bufferView] }))
    .filter(({ view }) => view)
    .sort((a, b) => b.view.byteLength - a.view.byteLength)[0];

if (!largestEmbeddedImage) throw new Error("No embedded image was found to optimise.");

const replacements = new Map();
const imageBytes = binary.subarray(
    largestEmbeddedImage.view.byteOffset || 0,
    (largestEmbeddedImage.view.byteOffset || 0) + largestEmbeddedImage.view.byteLength
);
const optimisedImage = await sharp(imageBytes)
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
replacements.set(largestEmbeddedImage.image.bufferView, optimisedImage);
largestEmbeddedImage.image.mimeType = "image/jpeg";

const chunks = [];
let byteOffset = 0;
for (let index = 0; index < document.bufferViews.length; index += 1) {
    const view = document.bufferViews[index];
    const bytes = replacements.get(index) || binary.subarray(
        view.byteOffset || 0,
        (view.byteOffset || 0) + view.byteLength
    );
    const alignment = (4 - byteOffset % 4) % 4;
    if (alignment) {
        chunks.push(Buffer.alloc(alignment));
        byteOffset += alignment;
    }
    view.byteOffset = byteOffset;
    view.byteLength = bytes.length;
    chunks.push(bytes);
    byteOffset += bytes.length;
}

const packedBinary = Buffer.concat(chunks);
document.buffers[0].byteLength = packedBinary.length;
document.asset.generator = "PIONEERS OF GREATNESS browser GLB optimiser";

const json = Buffer.from(JSON.stringify(document));
const jsonPadding = (4 - json.length % 4) % 4;
const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
const binaryPadding = (4 - packedBinary.length % 4) % 4;
const paddedBinary = Buffer.concat([packedBinary, Buffer.alloc(binaryPadding)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + paddedBinary.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(paddedJson.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(paddedBinary.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]));

const before = source.length / 1024 / 1024;
const after = (await fs.stat(outputPath)).size / 1024 / 1024;
console.log(`Optimised ${before.toFixed(2)} MB -> ${after.toFixed(2)} MB`);
console.log(`Room texture ${imageBytes.length} bytes -> ${optimisedImage.length} bytes`);
