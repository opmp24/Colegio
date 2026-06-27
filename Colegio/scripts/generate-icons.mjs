import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/favicon.svg");

async function generate() {
  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`);
    console.log(`Generated public/icon-${size}.png`);
  }
}

generate().catch(console.error);
