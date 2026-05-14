import type { Scenario } from "../types";

// 5 tiles wide × 5 tiles tall → 400×400 mask pixels.
// Bottom floor at row 4 (y=320..400) and top floor at row 1 (y=80..160)
// connected by a vertical ladder occupying column 2 (x=160..240).
// The top row 1 has `solid` either side of `floorLadderTop` so the
// character has a walkable surface to step off the ladder onto.
export const ladders: Scenario = {
  name: "ladders",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty"],
    ["solid", "solid", "floorLadderTop", "solid", "solid"],
    ["empty", "empty", "halfLadder_m", "empty", "empty"],
    ["empty", "empty", "halfLadder_m", "empty", "empty"],
    ["solid", "solid", "floorLadder", "solid", "solid"],
  ],
  spawn: { x: 60, y: 304 },
  targets: [
    { x: 200, y: 304, label: "walk-to-ladder-base" },
    { x: 200, y: 64, label: "climb-up" },
    { x: 320, y: 64, label: "walk-on-top" },
    { x: 200, y: 304, label: "climb-down" },
  ],
};
