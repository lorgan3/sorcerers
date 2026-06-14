import { THEMES } from "./palettes";
import { hexToRgb, rampIndex } from "./pixel";
import { noise2d } from "./rng";
import type { ZoneInfo } from "./zones";

export interface BackwallInput {
  /** Shared background buffer; back-wall is painted before debris/ladders. */
  background: ImageData;
  width: number;
  height: number;
  zoneMap: Int32Array;
  zones: ZoneInfo[];
  seed: number;
}

// empty pixels within this distance below their ceiling are progressively
// darkened — a downward contact shadow cast by the surface above them
const AO_RADIUS = 18;
const AO_MIN = 0.5;
// how far the back-wall's edge against open sky is allowed to wander
const EDGE_WOBBLE = 4;

/**
 * Paint the back-wall behind the terrain. Every solid pixel gets the back-wall
 * of its own zone (so erosion reveals the wall rather than empty sky), and every
 * empty pixel that has solid terrain above it gets the back-wall of the nearest
 * solid pixel above (its "ceiling"). Debris is drawn on top afterwards, so the
 * wall effectively runs down to the eroded edge of each span. Open sky (nothing
 * solid above) and themes without a back-wall (e.g. toon) stay transparent.
 *
 * Shading: ambient occlusion darkens each pocket pixel toward the surface above
 * it (never toward a floor below), and low-frequency noise mottles the rest, so
 * the wall reads as a lit surface rather than a flat fill. The wall's edge
 * against open sky is roughened with a wobbled lookup so it isn't dead straight.
 */
export function buildBackwall(input: BackwallInput): void {
  const { background, width, height, zoneMap, zones, seed } = input;
  const data = background.data;
  const n = width * height;

  // Pass 1: per column, resolve each pixel's back-wall zone and ambient factor.
  // zoneOf is -1 for open sky (nothing solid above). aoOf folds in the
  // below-the-ceiling occlusion so the paint pass only samples and mottles.
  const zoneOf = new Int32Array(n).fill(-1);
  const aoOf = new Float32Array(n);
  for (let x = 0; x < width; x++) {
    let ceilingZone = -1;
    let ceilingY = -1;
    for (let y = 0; y < height; y++) {
      const i = y * width + x;
      const zi = zoneMap[i];
      if (zi !== -1) {
        zoneOf[i] = zi;
        aoOf[i] = 1; // behind terrain: no open recess to occlude
        ceilingZone = zi;
        ceilingY = y;
      } else if (ceilingZone !== -1) {
        zoneOf[i] = ceilingZone;
        const d = y - ceilingY;
        aoOf[i] = AO_MIN + (1 - AO_MIN) * Math.min(1, d / AO_RADIUS);
      }
    }
  }

  const colorCache = new Map<string, [number, number, number][]>();
  const colorsFor = (themeId: string) => {
    let c = colorCache.get(themeId);
    if (!c) {
      c = THEMES[themeId].backwall!.ramp.map(hexToRgb);
      colorCache.set(themeId, c);
    }
    return c;
  };

  // Pass 2: paint. A wobbled horizontal lookup raggedizes two boundaries at once:
  // the wall's edge against open sky (an empty pixel whose neighbour is sky is
  // eroded) and the seam between two adjacent zones (a pixel adopts the
  // neighbour zone's theme). Solid backing is never eroded, and the interior
  // shading still comes from each pixel's own column.
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = y * width + x;
      const zoneIdx = zoneOf[i];
      if (zoneIdx === -1) continue; // open sky

      const off = Math.round(
        (noise2d(seed ^ 0x2c1f51ed, x >> 3, y >> 2) - 0.5) * 2 * EDGE_WOBBLE
      );
      const xs = Math.min(width - 1, Math.max(0, x + off));
      const sampled = zoneOf[y * width + xs];
      let zone = zoneIdx;
      if (sampled === -1) {
        if (zoneMap[i] === -1) continue; // empty pocket: ragged edge against sky
        // solid backing stays filled with its own zone
      } else {
        zone = sampled; // ragged seam between adjacent zones
      }

      const themeId = zones[zone].themeId;
      const band = THEMES[themeId].backwall;
      if (!band) continue; // theme opts out (toon)
      const colors = colorsFor(themeId);
      const [r, g, b] = colors[rampIndex(band, 0, x, y, seed)];

      const mottle = 0.88 + 0.12 * noise2d(seed ^ 0x5bd1e995, x >> 2, y >> 2);
      const f = aoOf[i] * mottle;

      const o = i * 4;
      data[o] = r * f;
      data[o + 1] = g * f;
      data[o + 2] = b * f;
      data[o + 3] = 255;
    }
  }
}
