import { noise2d } from "./rng";

export type PatternFn = (
  x: number,
  y: number,
  rampIndex: number,
  rampLength: number
) => number;

export interface MaterialBand {
  ramp: string[]; // light → dark hex colors
  pattern?: PatternFn;
}

export interface Theme {
  id: string;
  name: string;
  surface: MaterialBand & { thickness: number };
  shallow: MaterialBand & { depth: number };
  deep: MaterialBand;
  rubble: MaterialBand;
  ladder: { rail: string; rung: string };
  /** Pillow-shading silhouette outline; omit to disable for the theme. */
  outline?: string;
  /** Lightened background painted into roofed empty pockets; omit to opt out. */
  backwall?: MaterialBand;
}

/** Brick coursing: 8×4 bricks offset every other row; last ramp color = mortar. */
const brickPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const row = Math.floor(y / 4);
  const xo = row % 2 === 1 ? x + 4 : x;
  if (y % 4 === 3 || xo % 8 === 7) return rampLength - 1;
  const brickId = Math.floor(xo / 8) + row * 31;
  return Math.min(rampLength - 2, rampIndex + (brickId % 2));
};

/** Metal plates: 24×16 cells; last ramp color marks the seams. */
const platePattern: PatternFn = (x, y, rampIndex, rampLength) => {
  if (y % 16 === 15 || x % 24 === 23) return rampLength - 1;
  return Math.min(rampLength - 2, rampIndex);
};

/** Sparse short horizontal rebar streaks on the last ramp color (rust). */
const rebarPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const cellX = Math.floor(x / 40);
  const cellY = Math.floor(y / 16);
  const jitter = (cellX * 7 + cellY * 13) % 11;
  if (y % 16 === jitter && x % 40 < 12 + jitter) return rampLength - 1;
  return Math.min(rampLength - 2, rampIndex);
};

/** Jagged rock facets: diagonal fracture seams flipping direction per cell. */
const rockPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const cx = Math.floor(x / 20);
  const cy = Math.floor(y / 14);
  const diag = (cx * 31 + cy * 17) % 2 === 0 ? x + y : x - y;
  if (((diag % 20) + 20) % 20 === 19) return rampLength - 1;
  const facet = (cx * 13 + cy * 7 + Math.floor(((diag % 60) + 60) / 20)) % 2;
  return Math.min(rampLength - 2, rampIndex + facet);
};

/** Horizontal planks: 32×6 boards with staggered end seams; last ramp color = seam. */
const plankPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const row = Math.floor(y / 6);
  const xo = x + ((row * 13) % 32);
  if (y % 6 === 5 || xo % 32 === 31) return rampLength - 1;
  const plankId = Math.floor(xo / 32) + row * 17;
  return Math.min(rampLength - 2, rampIndex + (plankId % 2));
};

// Fixed seed for the position-stable texture noise the back-wall patterns use.
const PNOISE = 0x51ed2c1f;
// small ±n integer offset, stable per (x, y), for roughening pattern edges
const edgeJitter = (x: number, y: number, salt: number, n: number): number =>
  Math.round((noise2d(PNOISE ^ salt, x, y) - 0.5) * 2 * n);

/** Mineshaft: light rock with crisp vertical timber posts + cross-beams. */
const minePattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const px = ((x % 40) + 40) % 40;
  const py = ((y % 56) + 56) % 56;
  if (px < 7 || py < 6) {
    if (px === 0 || py === 0) return Math.max(0, rampLength - 3); // lit edge
    return rampLength - 1; // timber
  }
  const mottle = noise2d(PNOISE ^ 9, x >> 1, y >> 1) < 0.4 ? 1 : 0;
  return Math.min(rampLength - 2, rampIndex + mottle);
};

/** Dirt: mottled soil with scattered, varied embedded stones. */
const dirtPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const cx = Math.floor(x / 17);
  const cy = Math.floor(y / 15);
  if (noise2d(PNOISE ^ 21, cx, cy) > 0.74) {
    const ox = 4 + Math.floor(noise2d(PNOISE ^ 22, cx, cy) * 9);
    const oy = 4 + Math.floor(noise2d(PNOISE ^ 23, cx, cy) * 7);
    const rr = 3 + Math.floor(noise2d(PNOISE ^ 24, cx, cy) * 8);
    const dx = (((x % 17) + 17) % 17) - ox;
    const dy = (((y % 15) + 15) % 15) - oy;
    if (dx * dx + dy * dy < rr) {
      return dy < 0 ? rampLength - 2 : rampLength - 1; // lit top edge / stone
    }
  }
  const clump = noise2d(PNOISE ^ 25, x >> 2, y >> 2);
  return Math.min(rampLength - 2, clump > 0.6 ? 1 : 0);
};

/** Girders: light steel with a beveled, riveted I-beam lattice; fuzzy edges. */
const girderPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const gx = (((x + edgeJitter(x, y, 1, 2)) % 44) + 44) % 44;
  const gy = (((y + edgeJitter(x, y, 2, 2)) % 48) + 48) % 48;
  const onV = gx >= 16 && gx < 28;
  const onH = gy >= 20 && gy < 29;
  if ((onV && gy % 12 === 6) || (onH && gx % 12 === 6)) return rampLength - 1; // rivet
  if (onV || onH) {
    if ((onV && gx === 16) || (onH && gy === 20)) return 0; // lit edge
    if ((onV && gx === 27) || (onH && gy === 28)) return rampLength - 2; // shadow edge
    return rampLength - 3; // beam body
  }
  const mottle = noise2d(PNOISE ^ 33, x >> 2, y >> 2) > 0.6 ? 1 : 0;
  return Math.min(rampLength - 3, rampIndex + mottle);
};

/** Packed ice: lit strata bands with fuzzy crack seams and embedded stones. */
const icePattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const yj = y + edgeJitter(x, y, 3, 2);
  const into = ((yj % 11) + 11) % 11;
  if (into === 0) return rampLength - 1; // crack seam
  const cx = Math.floor(x / 24);
  const cy = Math.floor(y / 19);
  if (noise2d(PNOISE ^ 31, cx, cy) > 0.8) {
    const dx = (((x % 24) + 24) % 24) - 6;
    const dy = (((y % 19) + 19) % 19) - 6;
    if (dx * dx + dy * dy < 7) return rampLength - 1; // stone
  }
  if (into <= 1) return 0; // sheen just below the seam
  const band = ((Math.floor(yj / 11) % 2) + 2) % 2;
  return Math.min(rampLength - 2, rampIndex + band);
};

/** Timber frame: light backing with crisp vertical studs and a diagonal brace. */
const framePattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const bx = ((x % 34) + 34) % 34;
  const by = ((y % 34) + 34) % 34;
  const onStud = bx < 5;
  const onBrace = Math.abs(bx - by) < 3;
  if (onStud || onBrace) {
    if (bx === 0 || bx - by === -2) return Math.max(0, rampLength - 3); // lit edge
    return rampLength - 1; // timber
  }
  const grain = noise2d(PNOISE ^ 41, x >> 2, y) < 0.5 ? 0 : 1;
  return Math.min(rampLength - 2, rampIndex + grain);
};

export const THEMES: Record<string, Theme> = {
  grassland: {
    id: "grassland",
    name: "Grassland",
    surface: { ramp: ["#8bc34a", "#689f38", "#4a7729"], thickness: 12 },
    shallow: { ramp: ["#a9714b", "#8a5a3b", "#6f4730"], depth: 52 },
    deep: { ramp: ["#8a8478", "#6e695f", "#544f47"] },
    rubble: { ramp: ["#cbb59b", "#bca68b", "#ad967b"] },
    ladder: { rail: "#6f4730", rung: "#a9714b" },
    backwall: {
      // lightened tints of the foreground dirt (shallow ramp) so the wall reads
      // as the same earth seen behind the play surface
      ramp: ["#c89070", "#b27a58", "#996343", "#6f4730"],
      pattern: dirtPattern,
    },
  },
  cave: {
    id: "cave",
    name: "Cave",
    surface: { ramp: ["#7d7b74", "#666460"], thickness: 8 },
    shallow: {
      // last color is the fracture seam
      ramp: ["#5c5a55", "#4c4a46", "#3e3c39", "#23211e"],
      depth: 48,
      pattern: rockPattern,
    },
    deep: {
      // last color is the fracture seam
      ramp: ["#37352f", "#2c2a26", "#211f1c", "#100f0d"],
      pattern: rockPattern,
    },
    rubble: { ramp: ["#a8a69f", "#97958e", "#86847d"] },
    ladder: { rail: "#5a4634", rung: "#6f5640" },
    backwall: {
      ramp: ["#9a8f82", "#857a6d", "#6b6053", "#43361f"],
      pattern: minePattern,
    },
  },
  snow: {
    id: "snow",
    name: "Snow",
    surface: { ramp: ["#f4f8fb", "#dde7ee", "#c2d2dc"], thickness: 12 },
    shallow: { ramp: ["#9aa8b5", "#828f9c", "#6b7884"], depth: 52 },
    deep: { ramp: ["#5d6a78", "#4a5563", "#3a4350"] },
    rubble: { ramp: ["#e2e8ee", "#d2dae2", "#c1cbd5"] },
    ladder: { rail: "#5a4634", rung: "#8a5a3b" },
    backwall: {
      ramp: ["#e7eff5", "#d2dde6", "#b9c6d1", "#92a2b0"],
      pattern: icePattern,
    },
  },
  urban: {
    id: "urban",
    name: "Urban",
    surface: { ramp: ["#b9b9b3", "#a3a39d"], thickness: 10 },
    shallow: {
      // last color is the mortar line
      ramp: ["#a8503c", "#8f4434", "#76382b", "#55382f"],
      depth: 64,
      pattern: brickPattern,
    },
    deep: {
      // last color is the plate seam
      ramp: ["#5a5e63", "#4a4d52", "#3b3e42", "#2c2e31"],
      pattern: platePattern,
    },
    rubble: {
      // last color is the rebar rust
      ramp: ["#c6c6c0", "#b4b4ae", "#a2a29c", "#b97f50"],
      pattern: rebarPattern,
    },
    ladder: { rail: "#4a4d52", rung: "#6e6e68" },
    backwall: {
      ramp: ["#bcc1c7", "#a9aeb4", "#969ca3", "#7c848c", "#55606a"],
      pattern: girderPattern,
    },
  },
  planks: {
    id: "planks",
    name: "Wood planks",
    surface: { ramp: ["#c69a6d", "#b08653", "#997243"], thickness: 10 },
    shallow: {
      // last color is the board seam
      ramp: ["#a87f4f", "#967040", "#855f31", "#5a4226"],
      depth: 56,
      pattern: plankPattern,
    },
    deep: { ramp: ["#6e5233", "#5d4429", "#4c3720"] },
    rubble: { ramp: ["#dcc39c", "#cdb189", "#bd9f76"] },
    ladder: { rail: "#5a4226", rung: "#967040" },
    backwall: {
      ramp: ["#cba877", "#b1905f", "#8a6c44", "#4f3c24"],
      pattern: framePattern,
    },
  },
  toon: {
    id: "toon",
    name: "Toon",
    surface: { ramp: ["#7d7b74", "#666460"], thickness: 8 },
    shallow: { ramp: ["#5c5a55", "#4c4a46", "#3e3c39"], depth: 48 },
    deep: { ramp: ["#37352f", "#2c2a26", "#211f1c"] },
    rubble: { ramp: ["#a8a69f", "#97958e", "#86847d"] },
    ladder: { rail: "#5a4634", rung: "#6f5640" },
    outline: "#15140f",
  },
};

export const THEME_IDS = Object.keys(THEMES);
