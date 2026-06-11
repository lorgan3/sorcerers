import type { PlainBBox } from "../map/bbox";
import { buildDebris } from "./debris";
import { computeField } from "./field";
import { THEMES } from "./palettes";
import { createImageData, hexToRgb, pickZone, rampIndex } from "./pixel";
import { computeZones, type ZoneInfo } from "./zones";

export interface PaintInput {
  /** Solid bitmap, 1 byte per pixel (non-zero = solid). */
  alpha: Uint8Array;
  width: number;
  height: number;
  ladders: PlainBBox[];
  seed: number;
  themeOverrides?: Record<number, string>;
}

export interface PaintResult {
  /** Opaque exactly where the input alpha is solid. */
  terrain: ImageData;
  /** Debris + ladders, transparent elsewhere. */
  background: ImageData;
  zones: ZoneInfo[];
}

const OUTLINE_DEPTH = 2.5;
// each deep-ramp color covers this many px of depth before the next, darker one
const DEEP_PX_PER_RAMP_STEP = 28;

export function paintTerrain(input: PaintInput): PaintResult {
  const { alpha, width, height, ladders, seed } = input;
  const { depth, sky } = computeField(alpha, width, height);
  const { zoneMap, landmassMap, zones } = computeZones(
    alpha,
    width,
    height,
    seed,
    input.themeOverrides ?? {}
  );

  const terrain = createImageData(width, height);
  const data = terrain.data;
  const rgbCache = new Map<string, [number, number, number]>();
  const rgb = (hex: string) => {
    let v = rgbCache.get(hex);
    if (!v) {
      v = hexToRgb(hex);
      rgbCache.set(hex, v);
    }
    return v;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!alpha[i]) continue;
      const zi = pickZone(zoneMap, width, height, x, y, seed);
      const theme = THEMES[zones[zi].themeId];

      let hex: string;
      if (depth[i] <= OUTLINE_DEPTH) {
        hex = theme.outline;
      } else if (sky[i] < theme.surface.thickness) {
        const idx = rampIndex(
          theme.surface,
          sky[i] / theme.surface.thickness,
          x,
          y,
          seed
        );
        hex = theme.surface.ramp[idx];
      } else if (depth[i] < theme.shallow.depth) {
        const idx = rampIndex(
          theme.shallow,
          depth[i] / theme.shallow.depth,
          x,
          y,
          seed
        );
        hex = theme.shallow.ramp[idx];
      } else {
        const t = Math.min(
          0.999,
          (depth[i] - theme.shallow.depth) /
            (DEEP_PX_PER_RAMP_STEP * theme.deep.ramp.length)
        );
        hex = theme.deep.ramp[rampIndex(theme.deep, t, x, y, seed)];
      }

      const [r, g, b] = rgb(hex);
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }

  const background = buildDebris({
    width,
    height,
    zoneMap,
    landmassMap,
    zones,
    ladders,
    seed,
  });

  return { terrain, background, zones };
}
