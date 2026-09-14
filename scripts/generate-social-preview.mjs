import sharp from "sharp";

const width = 1200;
const height = 630;
const logo = await sharp("src/POG_FULL_LOGO_WHITE.png")
    .resize({ width: 470, height: 302, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

const background = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>
  <line x1="120" y1="530" x2="1080" y2="530" stroke="#ffffff" stroke-opacity="0.16"/>
  <text x="600" y="570" fill="#ffffff" fill-opacity="0.58" font-family="Georgia, serif" font-size="13" letter-spacing="4" text-anchor="middle">THIS RIPPLE WILL BE A TSUNAMI.</text>
</svg>`);

await sharp(background)
    .composite([{ input: logo, left: 365, top: 105 }])
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile("src/POG_SOCIAL_PREVIEW.jpg");

console.log("Generated src/POG_SOCIAL_PREVIEW.jpg (1200 × 630).");
