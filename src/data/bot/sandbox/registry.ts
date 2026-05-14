import { flat } from "./scenarios/flat";
import { gaps } from "./scenarios/gaps";
import { ladders } from "./scenarios/ladders";
import { overhang } from "./scenarios/overhang";
import { maze } from "./scenarios/maze";
import type { Scenario } from "./types";

export const SCENARIOS: Record<string, Scenario> = {
  [flat.name]: flat,
  [gaps.name]: gaps,
  [ladders.name]: ladders,
  [overhang.name]: overhang,
  [maze.name]: maze,
};
