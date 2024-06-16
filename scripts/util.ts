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

export const extract = (jimp: Jimp, colors: number[]) => {
  const clone = jimp.clone();

  for (let x = 0; x < jimp.getWidth(); x++) {
    for (let y = 0; y < jimp.getHeight(); y++) {
      const color = jimp.getPixelColor(x, y);

      if (colors.includes(color)) {
        jimp.setPixelColor(0x00000000, x, y);
      } else {
        clone.setPixelColor(0x00000000, x, y);
      }
    }
  }

  return clone;
};
