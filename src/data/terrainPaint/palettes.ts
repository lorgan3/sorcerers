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
  outline: string;
}

/** Brick coursing: 16×8 bricks offset every other row; last ramp color = mortar. */
const brickPattern: PatternFn = (x, y, rampIndex, rampLength) => {
  const row = Math.floor(y / 8);
  const xo = row % 2 === 1 ? x + 8 : x;
  if (y % 8 === 7 || xo % 16 === 15) return rampLength - 1;
  const brickId = Math.floor(xo / 16) + row * 31;
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

export const THEMES: Record<string, Theme> = {
  grassland: {
    id: "grassland",
    name: "Grassland",
    surface: { ramp: ["#8bc34a", "#689f38", "#4a7729"], thickness: 12 },
    shallow: { ramp: ["#a9714b", "#8a5a3b", "#6f4730"], depth: 52 },
    deep: { ramp: ["#8a8478", "#6e695f", "#544f47"] },
    rubble: { ramp: ["#6f5640", "#5a4634", "#463628"] },
    ladder: { rail: "#6f4730", rung: "#a9714b" },
    outline: "#2e2a23",
  },
  cave: {
    id: "cave",
    name: "Cave",
    surface: { ramp: ["#7d7b74", "#666460"], thickness: 8 },
    shallow: { ramp: ["#5c5a55", "#4c4a46", "#3e3c39"], depth: 48 },
    deep: { ramp: ["#37352f", "#2c2a26", "#211f1c"] },
    rubble: { ramp: ["#45433e", "#383631", "#2b2925"] },
    ladder: { rail: "#5a4634", rung: "#6f5640" },
    outline: "#15140f",
  },
  snow: {
    id: "snow",
    name: "Snow",
    surface: { ramp: ["#f4f8fb", "#dde7ee", "#c2d2dc"], thickness: 12 },
    shallow: { ramp: ["#9aa8b5", "#828f9c", "#6b7884"], depth: 52 },
    deep: { ramp: ["#5d6a78", "#4a5563", "#3a4350"] },
    rubble: { ramp: ["#76828d", "#616c77", "#4d5761"] },
    ladder: { rail: "#5a4634", rung: "#8a5a3b" },
    outline: "#27303c",
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
      ramp: ["#6e6e68", "#5a5a55", "#464642", "#8a5a2b"],
      pattern: rebarPattern,
    },
    ladder: { rail: "#4a4d52", rung: "#6e6e68" },
    outline: "#1d1e20",
  },
};

export const THEME_IDS = Object.keys(THEMES);
