import type { Scenario } from "../types";

// 10 tiles wide × 3 tiles tall at TILE_SIZE_PX = 80 → 800×240 mask px → 133×40
// game units at scale 6. Solid floor across the bottom row; the spawn sits
// on the floor near the left edge; targets walk to several points along it.
export const flat: Scenario = {
  name: "flat",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor"],
  ],
  spawn: { x: 20, y: 30 },
  targets: [
    { x: 60, y: 30, label: "walk-mid" },
    { x: 110, y: 30, label: "walk-far-right" },
    { x: 5, y: 30, label: "walk-back-left" },
  ],
};
