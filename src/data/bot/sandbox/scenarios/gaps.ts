import type { Scenario } from "../types";

// 8 tiles wide × 3 tiles tall → 640×240 mask pixels.
//
// Floor row is entirely `doubleJumpFloor` — each tile's upper walkway has
// two narrow gaps the character has to jump (gap width ~20 mask px, within
// MAX_JUMP_DISTANCE = 23). Dense back-to-back jumps stress the follower's
// edge sequencing and preroll-for-jump logic.
export const gaps: Scenario = {
  name: "gaps",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor", "doubleJumpFloor"],
  ],
  spawn: { x: 40, y: 150 },
  targets: [
    { x: 200, y: 150, label: "quarter-way" },
    { x: 400, y: 150, label: "half-way" },
    { x: 600, y: 150, label: "far-right" },
    { x: 40, y: 150, label: "return" },
  ],
};
