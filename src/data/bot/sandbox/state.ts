import type { CollisionMask } from "../../collision/collisionMask";
import type { Loaded } from "./types";

let active: Loaded | null = null;
let originalMask: CollisionMask | null = null;
let paused = false;

export function setActiveScenario(loaded: Loaded | null): void {
  active = loaded;
  if (!loaded) {
    originalMask = null;
    paused = false;
  }
}

export function getActiveScenario(): Loaded | null {
  return active;
}

/**
 * Snapshot of the pristine terrain collision mask, captured right after the
 * scenario's Map is built. `runAll` clones this back into the live terrain so
 * a previous run's fall-damage crater doesn't bias the next iteration.
 */
export function setOriginalMask(mask: CollisionMask | null): void {
  originalMask = mask;
}

export function getOriginalMask(): CollisionMask | null {
  return originalMask;
}

/**
 * Pause flag honoured by the Pixi tick + fixedTick callbacks. Set by
 * `followPath` when it detects damage so the user can inspect the moment
 * before the simulation continues; cleared by `runAll` or `window.debug.resume()`.
 */
export function setSandboxPaused(value: boolean): void {
  paused = value;
}

export function isSandboxPaused(): boolean {
  return paused;
}
