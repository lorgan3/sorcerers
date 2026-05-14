import type { Scenario } from "../types";

// A bottom floor and a top floor connected by a vertical ladder.
export const ladders: Scenario = {
  name: "ladders",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "floorLadderTop", "empty", "empty"],
    ["empty", "empty", "halfLadder", "empty", "empty"],
    ["empty", "empty", "halfLadder", "empty", "empty"],
    ["floor", "floor", "floorLadder", "floor", "floor"],
  ],
  spawn: { x: 10, y: 60 },
  targets: [
    { x: 30, y: 60, label: "walk-to-ladder-base" },
    { x: 30, y: 10, label: "climb-up" },
    { x: 60, y: 10, label: "walk-on-top" },
    { x: 30, y: 60, label: "climb-down" },
  ],
};
