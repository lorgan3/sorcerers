import type { MaterialBand } from "./palettes";
import { noise2d } from "./rng";

const SEAM_JITTER = 8;

/** Returns a new tuple; callers in hot loops should cache by hex string. */
export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** jsdom has no ImageData constructor in all versions; fall back to a plain shape. */
export function createImageData(width: number, height: number): ImageData {
  if (typeof ImageData !== "undefined") {
    return new ImageData(width, height);
  }
  return {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
    colorSpace: "srgb",
  } as unknown as ImageData;
}

/**
 * Map a position within a band (t in [0, 1), light → dark) to a ramp index,
 * with ±1 position-stable dither and the band's optional pattern applied last.
 */
export function rampIndex(
  band: MaterialBand,
  t: number,
  x: number,
  y: number,
  seed: number
): number {
  const len = band.ramp.length;
  let idx = Math.min(len - 1, Math.floor(Math.max(0, t) * len));
  // decorated seed gives rampIndex a noise stream independent of pickZone's
  const d = noise2d(seed ^ 0x9e3779b9, x, y);
  if (d < 0.12 && idx > 0) idx--;
  else if (d > 0.88 && idx < len - 1) idx++;
  if (band.pattern) idx = band.pattern(x, y, idx, len);
  return Math.max(0, Math.min(len - 1, idx));
}

/**
 * Sample the zone at a jittered position. Near zone seams this dithers
 * pixels between the two zones, producing ragged organic transitions.
 */
export function pickZone(
  zoneMap: Int32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  seed: number
): number {
  const jx = Math.min(
    width - 1,
    Math.max(
      0,
      x + Math.round((noise2d(seed, x, y) - 0.5) * 2 * SEAM_JITTER)
    )
  );
  const jy = Math.min(
    height - 1,
    Math.max(
      0,
      y + Math.round((noise2d(seed ^ 0x85ebca6b, x, y) - 0.5) * 2 * SEAM_JITTER)
    )
  );
  const zone = zoneMap[jy * width + jx];
  return zone >= 0 ? zone : zoneMap[y * width + x];
}
