import type { Scenario } from "../types";

// 10 tiles wide × 3 tiles tall → 800×240 mask pixels.
//
// The floor row is `doubleFloor` (solid base + continuous upper walkway)
// punctuated by two `doubleJumpFloor` tiles. `doubleJumpFloor` has the
// same outer shape as `doubleFloor` but the upper walkway carries small
// (~20 px) gaps — within MAX_JUMP_DISTANCE = 23 — so the character has
// to jump them. Full 80-px gaps (one empty tile) are 4× too wide for the
// jump physics, so tile-level gaps are not viable for jump testing.
//
// Body is 6×16. Spawn y=150 sits above any of the floor-row surfaces;
// gravity settles the body onto whichever tile's upper surface is below.
export const flat: Scenario = {
  name: "flat",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["doubleFloor", "doubleFloor", "doubleJumpFloor", "doubleFloor", "doubleFloor", "doubleFloor", "doubleJumpFloor", "doubleFloor", "doubleFloor", "doubleFloor"],
  ],
  spawn: { x: 40, y: 150 },
  targets: [
    { x: 120, y: 150, label: "before-first-jumps" },
    { x: 300, y: 150, label: "after-first-jumps" },
    { x: 440, y: 150, label: "before-second-jumps" },
    { x: 600, y: 150, label: "after-second-jumps" },
    { x: 40, y: 150, label: "return-home" },
  ],
};
