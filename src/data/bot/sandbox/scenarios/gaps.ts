import type { Scenario } from "../types";

// 8 tiles wide × 3 tiles tall → 640×240 mask pixels.
// Two floors separated by a 1-tile gap (80 px, within MAX_JUMP_DISTANCE).
// Targets: walk to the gap edge, jump across, return.
export const gaps: Scenario = {
  name: "gaps",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["solid", "solid", "solid", "empty", "solid", "solid", "solid", "solid"],
  ],
  spawn: { x: 60, y: 144 },
  targets: [
    { x: 200, y: 144, label: "to-gap-edge" },
    { x: 380, y: 144, label: "across-gap" },
    { x: 580, y: 144, label: "far-side" },
    { x: 60, y: 144, label: "return" },
  ],
};
