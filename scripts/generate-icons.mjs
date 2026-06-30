import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const svg = readFileSync(join(publicDir, "favicon.svg"));

await sharp(svg).resize(192, 192).png().toFile(join(publicDir, "icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(join(publicDir, "icon-512.png"));

console.log("PNG icons generated");
