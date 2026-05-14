import type { Loaded } from "./types";

let active: Loaded | null = null;

export function setActiveScenario(loaded: Loaded | null): void {
  active = loaded;
}

export function getActiveScenario(): Loaded | null {
  return active;
}
