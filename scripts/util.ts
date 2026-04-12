import { Jimp } from "jimp";
import { ResizeStrategy } from "@jimp/plugin-resize";
import fs from "fs";

// Jimp v1's type system produces structurally incompatible generics under TS6.
// Use a simplified type alias for Jimp instances in build scripts.
export type JimpImage = ReturnType<typeof Jimp.fromBitmap>;

export interface NamedImage {
  image: JimpImage;
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
export const rotate = (jimp: JimpImage, deg: number) => {
  return jimp
    .scale({ f: 3, mode: ResizeStrategy.NEAREST_NEIGHBOR })
    .rotate({ deg, mode: false })
    .scale({ f: 1 / 3, mode: ResizeStrategy.NEAREST_NEIGHBOR });
};

export const extract = (jimp: JimpImage, colors: number[]) => {
  const clone = jimp.clone();

  for (let x = 0; x < jimp.width; x++) {
    for (let y = 0; y < jimp.height; y++) {
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
