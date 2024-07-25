import Jimp from "jimp";
import { GifUtil } from "gifwrap";
import { Block, GrowingPacker, Packer, Resolution } from "binpacking";
import fs from "fs/promises";
import { Atlas, Frame, extract } from "./util.ts";

interface SpriteBlock extends Block {
  jimp: Jimp;
  name: string;
  fit?: Resolution;
  animation?: string;
  overlay?: Jimp;
}

const extractColors: Record<string, { from: number[]; to: string[] }> = {
  "atlas/elf": {
    from: [
      0x7e292cff, 0x7e4547ff, 0x7a272aff, 0x7a3d3fff, 0x7b282eff, 0x732325ff,
      0x782628ff, 0x722b2dff, 0x772527ff, 0x722c2eff, 0x722225ff, 0x671c1eff,
      0x6a1e20ff, 0x6e2022ff, 0x6c1f21ff, 0x6b1e20ff, 0x663a38ff, 0x6b1e21ff,
      0x691d1fff, 0x681c1eff, 0x9c484aff, 0x8e3f41ff, 0x3e0b0cff, 0x934042ff,
      0x7f2a2dff, 0x712224ff,
    ],
    to: ["#fa9821", "#fde74c", "#9cc53d", "#5cc0eb", "#e65933"],
  },
};

const ATLASES = { atlas: 2048, backgrounds: null };
const DIRECTORY = "./public/";

// This might help with edges containing colors of adjacent sprites in the atlas?
const MARGIN = 1;

const buildAtlas = async (name: string, resolution: number | null) => {
  const blocks: SpriteBlock[] = [];

  const contents = await fs.readdir(DIRECTORY + name);
  const files = contents.filter((file) => file.endsWith(".json"));
  const folders = contents.filter((file) => !file.includes("."));

  const frames: Record<string, Frame> = {};
  const animations: Record<string, string[]> = {};

  for (let folder of folders) {
    const folderName = `${name}/${folder}`;
    const files = await fs.readdir(`${DIRECTORY}${folderName}`);

    for (let file of files) {
      const frames: Jimp[] = [];
      if (file.toLowerCase().endsWith("gif")) {
        const gif = await GifUtil.read(`${DIRECTORY}${folderName}/${file}`);
        frames.push(
          ...gif.frames.map((frame) => GifUtil.shareAsJimp(Jimp, frame))
        );
      } else {
        try {
          frames.push(await Jimp.read(`${DIRECTORY}${folderName}/${file}`));
        } catch {
          console.log(`Skipping ${file}`);
        }
      }

      const fileName = file.split(".")[0];
      const parts = fileName.split("_");

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];

        const block = {
          w: frame.getWidth() + MARGIN * 2,
          h: frame.getHeight() + MARGIN * 2,
        };

        const config = extractColors[folderName];
        let overlays: Jimp[] = [];
        if (config) {
          const extracted = extract(frame, config.from).grayscale();

          overlays = config.to.map((color) =>
            extracted
              .clone()
              .color([{ apply: "mix" as any, params: [color, 50] }])
              .brightness(-0.1)
              .contrast(0.15)
          );
        }

        for (let j = 0; j < overlays.length || j < 1; j++) {
          const overlay = overlays[j];
          const frameName = [
            folder,
            parts[0],
            overlay ? j : undefined,
            parts[1],
          ]
            .filter((p) => p !== undefined)
            .join("_");

          blocks.push({
            ...block,
            jimp: frame,
            name: frames.length > 1 ? `${frameName}_${i + 1}` : frameName,
            ...(!isNaN(Number(parts[1])) && {
              animation: overlay
                ? `${folder}_${parts[0]}_${j}`
                : `${folder}_${parts[0]}`,
            }),
            ...(frames.length > 1 && { animation: frameName }),
            overlay,
          });
        }
      }
    }
  }

  for (let file of files) {
    let atlas: Atlas;

    try {
      atlas = JSON.parse(
        (await fs.readFile(`${DIRECTORY}${name}/${file}`)).toString()
      );
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
      image = await Jimp.read(`${DIRECTORY}${name}/${atlas.meta.image}`);
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

  let packer;
  let atlas;
  if (resolution) {
    packer = new Packer(resolution, resolution);
    packer.fit(blocks);

    atlas = new Jimp(resolution, resolution);
  } else {
    packer = new GrowingPacker();
    packer.fit(blocks);

    atlas = new Jimp(packer.root.w, packer.root.h);
  }

  for (let block of blocks) {
    if (block.fit!.used) {
      atlas.composite(block.jimp, block.fit!.x + MARGIN, block.fit!.y + MARGIN);

      if (block.overlay) {
        atlas.composite(
          block.overlay,
          block.fit!.x + MARGIN,
          block.fit!.y + MARGIN
        );
      }

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
      image: `${name}.png`,
      size: { w: atlas.getWidth(), h: atlas.getHeight() },
    },
  };

  await Promise.all([
    atlas.writeAsync(`./public/${name}.png`),
    fs.writeFile(`./public/${name}.json`, JSON.stringify(json, undefined, 2)),
  ]);
};

for (let name in ATLASES) {
  await buildAtlas(name, ATLASES[name as keyof typeof ATLASES]);
}
