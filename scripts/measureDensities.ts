import { Jimp } from "jimp";
import { readdirSync } from "fs";
import path from "path";

const dir = path.join("src", "data", "wfc", "tiles");

async function main() {
  const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  const out: Record<string, number> = {};
  for (const f of files.sort()) {
    const img = await Jimp.read(path.join(dir, f));
    const { width, height } = img.bitmap;
    let opaque = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if ((img.getPixelColor(x, y) & 0xff) > 128) opaque++;
    out[f.replace(".png", "")] = Math.round((opaque / (width * height)) * 1000) / 1000;
  }
  console.log(JSON.stringify(out, null, 2));
}

main();
