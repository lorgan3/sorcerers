import type { Scenario } from "../types";

// 8 tiles wide × 5 tiles tall → 640×400 mask pixels.
//
// Bottom floor at row 4 mixes `solid` with two `doubleJumpFloor` tiles
// (small jumps) before reaching the ladder at column 5. The ladder
// climbs to an upper platform at row 1 (y=80..160). Exercises walk +
// jump + climb in one path.
export const maze: Scenario = {
  name: "maze",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "solid", "floorLadderTop", "solid", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "halfLadder", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "halfLadder", "empty", "empty"],
    ["solid", "solid", "solid", "doubleJumpFloor", "doubleJumpFloor", "floorLadder", "solid", "solid"],
  ],
  spawn: { x: 40, y: 310 },
  targets: [
    { x: 220, y: 310, label: "before-jumps" },
    { x: 400, y: 310, label: "across-jumps" },
    { x: 440, y: 70, label: "top-of-ladder" },
    { x: 40, y: 310, label: "return-home" },
  ],
};
