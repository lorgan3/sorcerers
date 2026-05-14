import type { Scenario } from "../types";

// Two floors separated by a small gap (one tile wide, walk-jump distance).
// Targets: walk to the gap edge, jump across, return.
export const gaps: Scenario = {
  name: "gaps",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["floor", "floor", "floor", "empty", "floor", "floor", "floor", "floor"],
  ],
  spawn: { x: 20, y: 30 },
  targets: [
    { x: 40, y: 30, label: "to-gap-edge" },
    { x: 80, y: 30, label: "across-gap" },
    { x: 100, y: 30, label: "far-side" },
    { x: 5, y: 30, label: "return" },
  ],
};
