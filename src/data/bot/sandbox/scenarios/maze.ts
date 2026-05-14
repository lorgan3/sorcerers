import type { Scenario } from "../types";

// 8 tiles wide × 5 tiles tall → 640×400 mask pixels.
// Mixed layout exercising walk, jump, and climb edges:
//   - Bottom floor at row 4 (y=320..400) with a 1-tile gap at column 4
//   - A ladder run in column 5 from row 4 up to row 1
//   - An upper platform at row 1 (y=80..160) the character can reach
//     by climbing the ladder
export const maze: Scenario = {
  name: "maze",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "solid", "floorLadderTop", "solid", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "halfLadder", "empty", "empty"],
    ["empty", "empty", "empty", "empty", "empty", "halfLadder", "empty", "empty"],
    ["solid", "solid", "solid", "solid", "empty", "floorLadder", "solid", "solid"],
  ],
  spawn: { x: 60, y: 304 },
  targets: [
    { x: 280, y: 304, label: "walk-to-edge" },
    { x: 460, y: 304, label: "across-gap" },
    { x: 440, y: 64, label: "top-of-ladder" },
    { x: 60, y: 304, label: "return-home" },
  ],
};
