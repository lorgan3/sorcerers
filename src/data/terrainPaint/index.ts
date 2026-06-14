import type { PlainBBox } from "../map/bbox";
import { buildDebris, shadeLadderBases } from "./debris";
import { buildBackwall } from "./backwall";
import { computeField } from "./field";
import { THEMES } from "./palettes";
import { createImageData, hexToRgb, pickZone, rampIndex } from "./pixel";
import { noise2d } from "./rng";
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
  /** Themed back-wall + debris + ladders, transparent in open sky. */
  background: ImageData;
  zones: ZoneInfo[];
  /** Zone index per pixel, -1 for empty — lets the UI map clicks to zones. */
  zoneMap: Int32Array;
}

const OUTLINE_DEPTH = 2.5;
// each deep-ramp color covers this many px of depth before the next, darker one
const DEEP_PX_PER_RAMP_STEP = 28;
// px of low-frequency wobble added to the sky/depth fields so every depth-based
// transition — band boundaries AND the color steps within a band — undulates
// instead of tracing straight contours
const SKY_JITTER = 4;
const DEPTH_JITTER = 7;

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
      const zi = pickZone(zoneMap, width, height, x, y, seed, landmassMap);
      const theme = THEMES[zones[zi].themeId];

      // wobble the depth/sky fields so band boundaries and the color steps
      // within each band undulate; coarse noise keeps the wobble smooth, and
      // the raw depth still drives the crisp silhouette outline
      const skyV =
        sky[i] +
        (noise2d(seed ^ 0x2f1d35b, x >> 2, y >> 2) - 0.5) * 2 * SKY_JITTER;
      const depthV =
        depth[i] +
        (noise2d(seed ^ 0x77a3c19, x >> 2, y >> 2) - 0.5) * 2 * DEPTH_JITTER;

      let hex: string;
      if (theme.outline && depth[i] <= OUTLINE_DEPTH) {
        hex = theme.outline;
      } else if (skyV < theme.surface.thickness) {
        const idx = rampIndex(
          theme.surface,
          skyV / theme.surface.thickness,
          x,
          y,
          seed
        );
        hex = theme.surface.ramp[idx];
      } else if (depthV < theme.shallow.depth) {
        const idx = rampIndex(
          theme.shallow,
          depthV / theme.shallow.depth,
          x,
          y,
          seed
        );
        hex = theme.shallow.ramp[idx];
      } else {
        const t = Math.min(
          0.999,
          (depthV - theme.shallow.depth) /
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

  const background = createImageData(width, height);
  buildBackwall({ background, width, height, zoneMap, zones, seed });
  buildDebris({
    background,
    width,
    height,
    zoneMap,
    landmassMap,
    zones,
    ladders,
    seed,
  });
  shadeLadderBases(terrain, ladders, width, height);

  return { terrain, background, zones, zoneMap };
}
