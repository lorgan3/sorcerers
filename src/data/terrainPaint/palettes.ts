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
}

/** Brick coursing: 12×6 bricks offset every other row; last ramp color = mortar. */
const brickPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const row = Math.floor(y / 6);
  const xo = row % 2 === 1 ? x + 6 : x;
  if (y % 6 === 5 || xo % 12 === 11) return rampLength - 1;
  const brickId = Math.floor(xo / 12) + row * 31;
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

/** Horizontal planks: 32×6 boards with staggered end seams; last ramp color = seam. */
const plankPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const row = Math.floor(y / 6);
  const xo = x + ((row * 13) % 32);
  if (y % 6 === 5 || xo % 32 === 31) return rampLength - 1;
  const plankId = Math.floor(xo / 32) + row * 17;
  return Math.min(rampLength - 2, rampIndex + (plankId % 2));
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
  },
  cave: {
    id: "cave",
    name: "Cave",
    surface: { ramp: ["#7d7b74", "#666460"], thickness: 8 },
    shallow: { ramp: ["#5c5a55", "#4c4a46", "#3e3c39"], depth: 48 },
    deep: { ramp: ["#37352f", "#2c2a26", "#211f1c"] },
    rubble: { ramp: ["#a8a69f", "#97958e", "#86847d"] },
    ladder: { rail: "#5a4634", rung: "#6f5640" },
    outline: "#15140f",
  },
  snow: {
    id: "snow",
    name: "Snow",
    surface: { ramp: ["#f4f8fb", "#dde7ee", "#c2d2dc"], thickness: 12 },
    shallow: { ramp: ["#9aa8b5", "#828f9c", "#6b7884"], depth: 52 },
    deep: { ramp: ["#5d6a78", "#4a5563", "#3a4350"] },
    rubble: { ramp: ["#e2e8ee", "#d2dae2", "#c1cbd5"] },
    ladder: { rail: "#5a4634", rung: "#8a5a3b" },
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
  },
};

export const THEME_IDS = Object.keys(THEMES);
