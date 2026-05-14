import type { Scenario } from "../types";

// A floor with a ceiling overhang midway. Character must walk under, not jump.
export const overhang: Scenario = {
  name: "overhang",
  tiles: [
    ["empty", "empty", "empty", "empty", "empty", "empty", "empty"],
    ["empty", "empty", "empty", "halfCeiling", "empty", "empty", "empty"],
    ["floor", "floor", "floor", "floor", "floor", "floor", "floor"],
  ],
  spawn: { x: 15, y: 30 },
  targets: [
    { x: 50, y: 30, label: "under-overhang" },
    { x: 80, y: 30, label: "past-overhang" },
  ],
};
