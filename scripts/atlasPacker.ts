import Jimp from "jimp";
import { GifUtil } from "gifwrap";
import { Block, GrowingPacker, Resolution } from "binpacking";
import fs from "fs";
import { Atlas, Frame } from "./util";

interface SpriteBlock extends Block {
  jimp: Jimp;
  name: string;
  fit?: Resolution;
  animation?: string;
}

const blocks: SpriteBlock[] = [];

const DIRECTORY = "./public/atlas/";

// This might help with edges containing colors of adjacent sprites in the atlas?
const MARGIN = 1;

const contents = fs.readdirSync(DIRECTORY);
const files = contents.filter((file) => file.endsWith(".json"));
const folders = contents.filter((file) => !file.includes("."));

const frames: Record<string, Frame> = {};
const animations: Record<string, string[]> = {};

for (let folder of folders) {
  const files = fs.readdirSync(DIRECTORY + folder);

  for (let file of files) {
    const frames: Jimp[] = [];
    if (file.toLowerCase().endsWith("gif")) {
      const gif = await GifUtil.read(`${DIRECTORY}${folder}/${file}`);
      frames.push(
        ...gif.frames.map((frame) => GifUtil.shareAsJimp(Jimp, frame))
      );
    } else {
      try {
        frames.push(await Jimp.read(`${DIRECTORY}${folder}/${file}`));
      } catch {
        console.log(`Skipping ${file}`);
      }
    }

    const name = file.split(".")[0];
    const parts = name.split("_");

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      blocks.push({
        name:
          frames.length > 1
            ? `${folder}_${name}_${i + 1}`
            : `${folder}_${name}`,
        w: frame.getWidth() + MARGIN * 2,
        h: frame.getHeight() + MARGIN * 2,
        jimp: frame,
        ...(!isNaN(Number(parts[1])) && { animation: `${folder}_${parts[0]}` }),
        ...(frames.length > 1 && { animation: `${folder}_${name}` }),
      });
    }
  }
}

for (let file of files) {
  let atlas: Atlas;

  try {
    atlas = JSON.parse(fs.readFileSync(DIRECTORY + file).toString());
  } catch (error) {
    console.error(`Failed to load atlas for ${file}`, error);
    process.exit(1);
  }

  if (!atlas.frame && !atlas.frames) {
    console.error(`Invalid atlas for ${file}`);
    process.exit(1);
  }

  let image: Jimp;

  try {
    image = await Jimp.read(DIRECTORY + atlas.meta.image);
  } catch (error) {
    console.error(`Failed to load image for atlas ${file}`, error);
    process.exit(1);
  }

  if (atlas.animations) {
    for (let animation in atlas.animations) {
      animations[animation] = atlas.animations[animation];
    }
  }

  if (atlas.frame) {
    const animation: string[] = [];
    const atlasName = atlas.meta.image.split(".")[0];
    let index = 1;
    for (let j = 0; j < atlas.meta.size.h; j += atlas.frame.h) {
      for (let i = 0; i < atlas.meta.size.w; i += atlas.frame.w) {
        const name = `${atlasName}_${index++}`;
        animation.push(name);

        const jimp = new Jimp(atlas.frame.w, atlas.frame.h).blit(
          image,
          0,
          0,
          i,
          j,
          atlas.frame.w,
          atlas.frame.h
        );

        blocks.push({
          name,
          w: atlas.frame.w + MARGIN * 2,
          h: atlas.frame.h + MARGIN * 2,
          jimp,
        });
      }
    }

    if (atlas.animation) {
      animations[atlas.animation] = animation;
    }
  }

  if (atlas.frames) {
    Object.entries(atlas.frames).forEach(([name, { frame }]) => {
      const jimp = new Jimp(frame.w, frame.h).blit(
        image,
        0,
        0,
        frame.x,
        frame.y,
        frame.w,
        frame.h
      );

      blocks.push({
        name,
        w: frame.w + MARGIN * 2,
        h: frame.h + MARGIN * 2,
        jimp,
      });
    });
  }
}

blocks.sort((a, b) => b.h - a.h);

const packer = new GrowingPacker();
packer.fit(blocks);

const atlas = new Jimp(packer.root.w, packer.root.h);
for (let block of blocks) {
  if (block.fit!.used) {
    atlas.composite(block.jimp, block.fit!.x + MARGIN, block.fit!.y + MARGIN);

    frames[block.name] = {
      frame: {
        x: block.fit!.x + MARGIN,
        y: block.fit!.y + MARGIN,
        w: block.w - MARGIN * 2,
        h: block.h - MARGIN * 2,
      },
    };

    if (block.animation) {
      animations[block.animation] = animations[block.animation] || [];
      animations[block.animation].push(block.name);
    }
  } else {
    console.error(`Block ${block.name} did not fit!`);
    process.exit(1);
  }
}

for (let animation in animations) {
  const frames = animations[animation];

  frames.sort(
    (a, b) =>
      Number(a.split(".")[0].split("_").at(-1)) -
      Number(b.split(".")[0].split("_").at(-1))
  );
}

const json: Atlas = {
  frames,
  animations,
  meta: {
    app: "https://github.com/lorgan3/sorcerers",
    version: "1.0",
    image: `atlas.png`,
    size: { w: packer.root.w, h: packer.root.h },
  },
};

await atlas.write(`./public/atlas.png`);
fs.writeFileSync(`./public/atlas.json`, JSON.stringify(json, undefined, 2));
