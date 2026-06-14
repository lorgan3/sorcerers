import type { PlainBBox } from "../map/bbox";
import { THEMES } from "./palettes";
import { hexToRgb, pickZone, rampIndex } from "./pixel";
import { noise2d } from "./rng";
import { isEmptyZone, type ZoneInfo } from "./zones";

export interface DebrisInput {
  background: ImageData;
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
// eroded terrain reads as deep shadow: darken the wall to the back-wall's
// darkest ambient-occlusion level (AO_MIN) so debris matches those shadows
const DEBRIS_SHADE = 0.5;
// deep terrain shouldn't crater: never erode more than this from a span's top
const MAX_EROSION_PX = 10;
const RUBBLE_BAND_PX = 22;
const RAIL_WIDTH = 2;
const RUNG_SPACING = 8;
const RUNG_HEIGHT = 2;
// darkest multiplier of the contact shadow pooled at a ladder's base
const LADDER_AO_MIN = 0.72;
// darkest multiplier of the shadow a ladder casts on the wall along its length
const LADDER_SHADOW_MIN = 0.74;

/**
 * Build the destroyed-terrain background: every landmass collapses into a
 * debris mound that is a strict subset of its original silhouette, plus
 * ladders drawn in empty space. Everything else stays fully transparent.
 */
export function buildDebris(input: DebrisInput): void {
  const { background, width, height, zoneMap, landmassMap, zones, ladders, seed } =
    input;
  // shade the back-wall ramp (the same material seen behind terrain) down to the
  // occlusion-shadow level; fall back to rubble for themes without a back-wall
  const debrisBands = zones.map((zone) => {
    const theme = THEMES[zone.themeId];
    return { ramp: (theme.backwall ?? theme.rubble).ramp };
  });
  const debrisColors = debrisBands.map((band) =>
    band.ramp.map((hex) => {
      const [r, g, b] = hexToRgb(hex);
      return [r * DEBRIS_SHADE, g * DEBRIS_SHADE, b * DEBRIS_SHADE] as [
        number,
        number,
        number
      ];
    })
  );
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
      const mound = noise2d(seed, lm * 131 + (x >> 3), 0);
      const roughen = Math.floor(noise2d(seed, x, lm + 1) * ROUGHEN_PX);
      const keep = KEEP_BASE + mound * KEEP_VARIATION;
      const fractional = spanH - Math.max(0, Math.floor(spanH * keep) - roughen);
      // when the fraction would erode deeper than the cap, fall back to a
      // capped erosion that still varies with the same noise so the edge
      // stays rough instead of tracking the silhouette as a flat line
      const capped =
        MAX_EROSION_PX - Math.floor(mound * (MAX_EROSION_PX / 2)) - roughen;
      const erosion = Math.min(fractional, Math.max(0, capped));
      const newTop = y + erosion;
      for (let yy = newTop; yy < end; yy++) {
        const zi = pickZone(zoneMap, width, height, x, yy, seed);
        const colors = debrisColors[zi];
        const t = Math.min(0.999, (yy - newTop) / (RUBBLE_BAND_PX * colors.length));
        const idx = rampIndex(debrisBands[zi], t, x, yy, seed);
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
        // slices eaten by boundary wobble have an empty bbox; never match them
        if (isEmptyZone(zone)) continue;
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

      // soft shadow the ladder casts on the wall behind it, the full length,
      // fading out sideways; only darkens existing opaque wall/debris
      const sHalf = (right - left) * 0.9 + 3;
      const ssLo = Math.max(0, Math.floor(cx - sHalf));
      const ssHi = Math.min(width, Math.ceil(cx + sHalf));
      for (let yy = top; yy < bottom; yy++) {
        for (let xx = ssLo; xx < ssHi; xx++) {
          const o = (yy * width + xx) * 4;
          if (data[o + 3] !== 255) continue;
          const dx = Math.abs(xx - cx) / sHalf;
          if (dx >= 1) continue;
          const k = LADDER_SHADOW_MIN + (1 - LADDER_SHADOW_MIN) * dx;
          data[o] *= k;
          data[o + 1] *= k;
          data[o + 2] *= k;
        }
      }

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
}

/**
 * Pool a soft radial contact shadow on the given layer around each ladder's
 * base, fading up and outward. Applied to the terrain layer so the shadow lands
 * on the ledge the ladder rests on; only darkens existing opaque pixels.
 */
export function shadeLadderBases(
  image: ImageData,
  ladders: PlainBBox[],
  width: number,
  height: number
): void {
  const data = image.data;
  for (const ladder of ladders) {
    const baseX = Math.round((ladder.left + ladder.right) / 2);
    const bottom = Math.min(height, Math.round(ladder.bottom));
    // wide, shallow ellipse so the shadow spreads sideways more than it sinks
    const rx = Math.max(16, Math.round((ladder.right - ladder.left) * 1.6));
    const ry = Math.round(rx * 0.6);
    const syLo = Math.max(0, bottom - ry);
    const syHi = Math.min(height, bottom + (ry >> 1));
    const sxLo = Math.max(0, baseX - rx);
    const sxHi = Math.min(width, baseX + rx);
    for (let yy = syLo; yy < syHi; yy++) {
      for (let xx = sxLo; xx < sxHi; xx++) {
        const o = (yy * width + xx) * 4;
        if (data[o + 3] !== 255) continue;
        const dx = (xx - baseX) / rx;
        const dy = (yy - bottom) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= 1) continue;
        const k = LADDER_AO_MIN + (1 - LADDER_AO_MIN) * d;
        data[o] *= k;
        data[o + 1] *= k;
        data[o + 2] *= k;
      }
    }
  }
}
