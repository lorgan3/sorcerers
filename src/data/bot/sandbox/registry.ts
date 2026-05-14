import { flat } from "./scenarios/flat";
import type { Scenario } from "./types";

export const SCENARIOS: Record<string, Scenario> = {
  [flat.name]: flat,
};
