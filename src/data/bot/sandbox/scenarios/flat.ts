import type { Scenario } from "../types";

// 10 tiles wide × 3 tiles tall at TILE_SIZE_PX = 80 → 800×240 mask pixels.
// Coordinates below are in mask pixels (= game units at scale 6).
//
// Layout:
//   Row 0 (y=0..80):    sky
//   Row 1 (y=80..160):  sky
//   Row 2 (y=160..240): floor row, with two single-tile gaps to require jumps
//
// `solid` is used instead of `floor` so the playable surface has no
// alpha-edge ambiguity around the post-process blur. The character body
// is 6×16; spawn y=144 puts feet exactly on the floor surface at y=160.
export const flat: Scenario = {
  name: "flat",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["solid", "solid", "empty", "solid", "solid", "empty", "solid", "solid", "solid", "solid"],
  ],
  spawn: { x: 60, y: 144 },
  targets: [
    { x: 100, y: 144, label: "walk-right" },
    { x: 280, y: 144, label: "first-jump" },
    { x: 540, y: 144, label: "second-jump" },
    { x: 700, y: 144, label: "far-right" },
    { x: 60, y: 144, label: "return-home" },
  ],
};
