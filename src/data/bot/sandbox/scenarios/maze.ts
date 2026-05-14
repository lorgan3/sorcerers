import type { Scenario } from "../types";

// Mixed layout: ramps, gaps, a ladder. Stress-test the full edge taxonomy.
export const maze: Scenario = {
  name: "maze",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "floorLadderTop", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "halfLadder", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "floor", "floorLadder", "floor", "empty", "empty", "empty"],
    ["ramp", "floor", "empty", "empty", "empty", "floor", "ramp_m", "floor"],
  ],
  spawn: { x: 10, y: 60 },
  targets: [
    { x: 40, y: 45, label: "up-the-ramp" },
    { x: 40, y: 15, label: "climb-to-top" },
    { x: 90, y: 60, label: "down-and-across" },
  ],
};
