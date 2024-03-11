import Jimp from "jimp";
import fs from "fs";

export interface NamedImage {
  image: Jimp;
  name: string;
}

export interface Frame {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface Atlas {
  frames?: Record<string, Frame>;
  animations?: Record<string, string[]>;
  frame?: { w: number; h: number };
  animation?: string;
  meta: {
    app: string;
    version: string;
    image: string;
    size: { w: number; h: number };
  };
}

/**
 * Dumb workaround because Jimp messes up the center on power of 2 images :/
 */
export const rotate = (jimp: Jimp, deg: number) => {
  return jimp
    .scale(3, Jimp.RESIZE_NEAREST_NEIGHBOR)
    .rotate(deg, false)
    .scale(1 / 3, Jimp.RESIZE_NEAREST_NEIGHBOR);
};

export const write = async (images: NamedImage[], name: string) => {
  const actualSize = images[0].image.getWidth();
  const width = Math.ceil(Math.sqrt(images.length));
  const out = new Jimp(actualSize * width, actualSize * width);

  const frames: Record<string, Frame> = {};
  images.forEach(({ image, name }, i) => {
    const x = (i % width) * actualSize;
    const y = Math.floor(i / width) * actualSize;
    out.blit(image, x, y);

    frames[name] = {
      frame: { x, y, w: actualSize, h: actualSize },
    };
  });

  const json: Atlas = {
    frames,
    meta: {
      app: "https://github.com/lorgan3/open-td",
      version: "1.0",
      image: `${name}.png`,
      size: { w: out.getWidth(), h: out.getHeight() },
    },
  };

  await out.write(`./public/atlas/${name}.png`);

  await new Promise((resolve) =>
    fs.writeFile(
      `./public/atlas/${name}.json`,
      JSON.stringify(json, undefined, 2),
      resolve
    )
  );
};
