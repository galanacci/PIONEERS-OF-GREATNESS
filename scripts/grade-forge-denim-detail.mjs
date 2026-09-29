import sharp from "sharp";

// Match the supplied FORGE detail photo to the darker front/back product shots.
// Only blue denim pixels are graded; the light neutral stitching stays intact.
const [input, output] = process.argv.slice(2);
if (!input || !output) {
    console.error("Usage: node scripts/grade-forge-denim-detail.mjs INPUT OUTPUT");
    process.exit(1);
}

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const clamp = (value) => Math.max(0, Math.min(1, value));
for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const index = pixel * 3;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const brightness = Math.max(red, green, blue);
    const denim = clamp((blue - red - 4) / 16);
    const highlightProtection = clamp((150 - brightness) / 35);
    const weight = denim * highlightProtection;

    data[index] = Math.min(255, Math.round(red * (1 + 0.08 * weight)));
    data[index + 1] = Math.round(green * (1 - 0.18 * weight));
    data[index + 2] = Math.round(blue * (1 - 0.31 * weight));
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 94, effort: 6 })
    .toFile(output);
console.log(`Saved colour-matched detail: ${output}`);
