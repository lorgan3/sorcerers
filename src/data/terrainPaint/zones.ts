import type { PlainBBox } from "../map/bbox";
import { THEMES } from "./palettes";
import { noise2d } from "./rng";

export interface ZoneInfo {
  id: number;
  bbox: PlainBBox; // right/bottom exclusive
  themeId: string;
}

export interface ZoneResult {
  /** Zone index per pixel, -1 for empty. */
  zoneMap: Int32Array;
  /** Landmass index per pixel, -1 for empty. Zones subdivide landmasses. */
  landmassMap: Int32Array;
  zones: ZoneInfo[];
}

export const MAX_ZONE_WIDTH = 960; // ~12 WFC tiles
const BOUNDARY_WOBBLE = 48;

const DEFAULT_THEME = "grassland";

/** Every zone defaults to grassland; overrides are explicit user choices. */
export function computeZones(
  alpha: Uint8Array,
  width: number,
  height: number,
  seed: number,
  themeOverrides: Record<number, string> = {}
): ZoneResult {
  const n = width * height;
  const landmassMap = new Int32Array(n).fill(-1);
  const landmassBBoxes: PlainBBox[] = [];

  // 4-connected flood fill, iterative
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (!alpha[start] || landmassMap[start] !== -1) continue;
    const id = landmassBBoxes.length;
    const bbox = { left: width, top: height, right: 0, bottom: 0 };
    landmassMap[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      if (x < bbox.left) bbox.left = x;
      if (x + 1 > bbox.right) bbox.right = x + 1;
      if (y < bbox.top) bbox.top = y;
      if (y + 1 > bbox.bottom) bbox.bottom = y + 1;
      if (x > 0 && alpha[i - 1] && landmassMap[i - 1] === -1) {
        landmassMap[i - 1] = id;
        stack.push(i - 1);
      }
      if (x < width - 1 && alpha[i + 1] && landmassMap[i + 1] === -1) {
        landmassMap[i + 1] = id;
        stack.push(i + 1);
      }
      if (y > 0 && alpha[i - width] && landmassMap[i - width] === -1) {
        landmassMap[i - width] = id;
        stack.push(i - width);
      }
      if (y < height - 1 && alpha[i + width] && landmassMap[i + width] === -1) {
        landmassMap[i + width] = id;
        stack.push(i + width);
      }
    }
    landmassBBoxes.push(bbox);
  }

  // wide landmasses are split into vertical slices with wobbled boundaries
  const zones: ZoneInfo[] = [];
  const slicing = landmassBBoxes.map((bbox) => {
    const count = Math.max(
      1,
      Math.ceil((bbox.right - bbox.left) / MAX_ZONE_WIDTH)
    );
    const firstZone = zones.length;
    for (let s = 0; s < count; s++) {
      zones.push({
        id: firstZone + s,
        bbox: { left: width, top: height, right: 0, bottom: 0 },
        themeId: "",
      });
    }
    return { bbox, count, firstZone };
  });

  const zoneMap = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const lm = landmassMap[i];
    if (lm === -1) continue;
    const x = i % width;
    const y = (i - x) / width;
    const { bbox, count, firstZone } = slicing[lm];
    if (count === 1) {
      zoneMap[i] = firstZone;
    } else {
      const sliceWidth = (bbox.right - bbox.left) / count;
      let slice = 0;
      for (let s = 1; s < count; s++) {
        // coarse row granularity keeps the wobble smooth-ish; the paint
        // pass dithers the seam so the 16px steps never show
        const wobble =
          (noise2d(seed, lm * 97 + s, y >> 4) - 0.5) * BOUNDARY_WOBBLE;
        if (x >= bbox.left + s * sliceWidth + wobble) slice = s;
      }
      zoneMap[i] = firstZone + slice;
    }
    const zone = zones[zoneMap[i]];
    if (x < zone.bbox.left) zone.bbox.left = x;
    if (x + 1 > zone.bbox.right) zone.bbox.right = x + 1;
    if (y < zone.bbox.top) zone.bbox.top = y;
    if (y + 1 > zone.bbox.bottom) zone.bbox.bottom = y + 1;
  }
  // a slice can end up with zero pixels when the wobble eats it entirely
  for (const zone of zones) {
    if (zone.bbox.left > zone.bbox.right) {
      zone.bbox = { left: 0, top: 0, right: 0, bottom: 0 };
    }
  }

  for (const zone of zones) {
    const override = themeOverrides[zone.id];
    zone.themeId = override && THEMES[override] ? override : DEFAULT_THEME;
  }

  return { zoneMap, landmassMap, zones };
}
