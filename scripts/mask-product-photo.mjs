import sharp from "sharp";

// For dark garments photographed against a near-white seamless background.
// Keep the dark region connected to the garment centre, then fill enclosed light details.
const [input, output] = process.argv.slice(2);
if (!input || !output) {
    console.error("Usage: node scripts/mask-product-photo.mjs INPUT OUTPUT");
    process.exit(1);
}

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const length = width * height;
const dark = new Uint8Array(length);
const foreground = new Uint8Array(length);
const outside = new Uint8Array(length);
const queue = new Uint32Array(length);

for (let index = 0; index < length; index += 1) {
    const pixel = index * 3;
    const red = data[pixel];
    const green = data[pixel + 1];
    const blue = data[pixel + 2];
    const brightness = Math.max(red, green, blue);
    // Keep the shadow filter below the jacket hem: starting it higher clips
    // real dark denim along the outer sleeve edge.
    const lowerShadow = Math.floor(index / width) >= height * 0.70;
    dark[index] = brightness < 120 && (!lowerShadow || blue - red >= 2 || brightness < 35) ? 1 : 0;
}

const seed = Math.floor(height * 0.5) * width + Math.floor(width * 0.5);
if (!dark[seed]) throw new Error("The centre is not dark garment material; this photo needs a different mask.");

function visitNeighbours(index, visit) {
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < length - width) visit(index + width);
}

let head = 0;
let tail = 1;
queue[0] = seed;
foreground[seed] = 1;
while (head < tail) {
    visitNeighbours(queue[head++], (next) => {
        if (!dark[next] || foreground[next]) return;
        foreground[next] = 1;
        queue[tail++] = next;
    });
}

head = 0;
tail = 0;
function addOutside(index) {
    if (foreground[index] || outside[index]) return;
    outside[index] = 1;
    queue[tail++] = index;
}
for (let x = 0; x < width; x += 1) {
    addOutside(x);
    addOutside((height - 1) * width + x);
}
for (let y = 0; y < height; y += 1) {
    addOutside(y * width);
    addOutside(y * width + width - 1);
}
while (head < tail) visitNeighbours(queue[head++], addOutside);

const rgba = Buffer.alloc(length * 4);
for (let index = 0; index < length; index += 1) {
    const source = index * 3;
    const target = index * 4;
    rgba[target] = data[source];
    rgba[target + 1] = data[source + 1];
    rgba[target + 2] = data[source + 2];
    rgba[target + 3] = outside[index] ? 0 : 255;
}
const image = sharp(rgba, { raw: { width, height, channels: 4 } });
if (output.toLowerCase().endsWith(".webp")) await image.webp({ quality: 90, effort: 6 }).toFile(output);
else await image.png().toFile(output);
console.log(`Saved ${output} (${width}x${height}, ${length - tail} opaque pixels)`);
