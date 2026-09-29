import sharp from "sharp";

// Colour-match the FORGE back cutout to the front without changing its
// photographed texture, stitching, silhouette, or transparency. Run once
// immediately after regenerating the ungraded cutout from the source photo.
const [input, output] = process.argv.slice(2);
if (!input || !output) {
    console.error("Usage: node scripts/match-forge-denim-colour.mjs INPUT OUTPUT");
    process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const index = pixel * 4;
    const alpha = data[index + 3];
    if (!alpha) continue;

    const brightness = Math.max(data[index], data[index + 1], data[index + 2]);
    // Protect near-black folds and bright stitching; grade the denim midtones.
    const shadowWeight = Math.max(0, Math.min(1, (brightness - 8) / 22));
    const highlightWeight = Math.max(0, Math.min(1, (110 - brightness) / 35));
    const weight = shadowWeight * highlightWeight;
    data[index] = Math.max(0, Math.round(data[index] - 0.3 * weight));
    data[index + 1] = Math.min(255, Math.round(data[index + 1] + 2.7 * weight));
    data[index + 2] = Math.min(255, Math.round(data[index + 2] + 4.4 * weight));
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 95, effort: 6 })
    .toFile(output);
console.log(`Saved colour-matched back cutout: ${output}`);
