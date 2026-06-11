import type { PlainBBox } from "../map/bbox";
import { THEMES } from "./palettes";
import { createImageData, hexToRgb, pickZone, rampIndex } from "./pixel";
import { noise2d } from "./rng";
import type { ZoneInfo } from "./zones";

export interface DebrisInput {
  width: number;
  height: number;
  zoneMap: Int32Array;
  landmassMap: Int32Array;
  zones: ZoneInfo[];
  ladders: PlainBBox[];
  seed: number;
}

const KEEP_BASE = 0.4;
const KEEP_VARIATION = 0.2;
const ROUGHEN_PX = 3;
const RUBBLE_BAND_PX = 22;
const RAIL_WIDTH = 2;
const RUNG_SPACING = 8;
const RUNG_HEIGHT = 2;

/**
 * Build the destroyed-terrain background: every landmass collapses into a
 * debris mound that is a strict subset of its original silhouette, plus
 * ladders drawn in empty space. Everything else stays fully transparent.
 */
export function buildDebris(input: DebrisInput): ImageData {
  const { width, height, zoneMap, landmassMap, zones, ladders, seed } = input;
  const rubbleColors = zones.map((zone) =>
    THEMES[zone.themeId].rubble.ramp.map(hexToRgb)
  );
  const background = createImageData(width, height);
  const data = background.data;

  // per column, per landmass span: keep only the bottom portion
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      const lm = landmassMap[y * width + x];
      if (lm === -1) {
        y++;
        continue;
      }
      let end = y;
      while (end < height && landmassMap[end * width + x] === lm) end++;
      const spanH = end - y;
      // coarse noise (8-column steps) shapes the mound; fine noise roughens it
      const keep =
        KEEP_BASE + noise2d(seed, lm * 131 + (x >> 3), 0) * KEEP_VARIATION;
      const roughen = Math.floor(noise2d(seed, x, lm + 1) * ROUGHEN_PX);
      const kept = Math.max(0, Math.floor(spanH * keep) - roughen);
      const newTop = Math.max(y, end - kept);
      for (let yy = newTop; yy < end; yy++) {
        const zi = pickZone(zoneMap, width, height, x, yy, seed);
        const colors = rubbleColors[zi];
        const t = Math.min(0.999, (yy - newTop) / (RUBBLE_BAND_PX * colors.length));
        const idx = rampIndex(THEMES[zones[zi].themeId].rubble, t, x, yy, seed);
        const [r, g, b] = colors[idx];
        const o = (yy * width + x) * 4;
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 255;
      }
      y = end;
    }
  }

  // ladders: rails on both edges, rungs every RUNG_SPACING rows
  if (zones.length > 0) {
    for (const ladder of ladders) {
      const cx = (ladder.left + ladder.right) / 2;
      const cy = (ladder.top + ladder.bottom) / 2;
      let best = 0;
      let bestDist = Infinity;
      for (const zone of zones) {
        const zx = (zone.bbox.left + zone.bbox.right) / 2;
        const zy = (zone.bbox.top + zone.bbox.bottom) / 2;
        const dist = (zx - cx) ** 2 + (zy - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = zone.id;
        }
      }
      const theme = THEMES[zones[best].themeId];
      const rail = hexToRgb(theme.ladder.rail);
      const rung = hexToRgb(theme.ladder.rung);

      const left = Math.max(0, Math.round(ladder.left));
      const right = Math.min(width, Math.round(ladder.right));
      const top = Math.max(0, Math.round(ladder.top));
      const bottom = Math.min(height, Math.round(ladder.bottom));
      for (let yy = top; yy < bottom; yy++) {
        for (let xx = left; xx < right; xx++) {
          const isRail = xx < left + RAIL_WIDTH || xx >= right - RAIL_WIDTH;
          const isRung = (yy - top) % RUNG_SPACING < RUNG_HEIGHT;
          if (!isRail && !isRung) continue;
          const [r, g, b] = isRail ? rail : rung;
          const o = (yy * width + xx) * 4;
          data[o] = r;
          data[o + 1] = g;
          data[o + 2] = b;
          data[o + 3] = 255;
        }
      }
    }
  }

  return background;
}
