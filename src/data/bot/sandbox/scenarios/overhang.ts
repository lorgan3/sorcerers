import type { Scenario } from "../types";

// 7 tiles wide × 3 tiles tall → 560×240 mask pixels.
// A continuous floor with a low ceiling overhang midway. Character must walk
// under, not jump (jumping into the overhang stops the upward motion).
export const overhang: Scenario = {
  name: "overhang",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "halfCeiling", "empty", "empty", "empty"],
    ["solid", "solid", "solid", "solid", "solid", "solid", "solid"],
  ],
  spawn: { x: 60, y: 144 },
  targets: [
    { x: 200, y: 144, label: "before-overhang" },
    { x: 360, y: 144, label: "under-overhang" },
    { x: 500, y: 144, label: "past-overhang" },
  ],
};
