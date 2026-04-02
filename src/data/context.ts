import type { Level } from "./map/level";
import type { Manager } from "./network/manager";
import type { Server } from "./network/server";

// Note: Client.instance is intentionally not part of GameContext.
// Client is only used in UI components (Inventory.vue, Join.vue, JoinDialog.vue),
// not in game logic, so it doesn't need mock injection for testing.

export interface GameContext {
  level: Level;
  manager: Manager;
  server: Server | null;
}

let _context: GameContext | null = null;

// Fallback accessors for pre-context access (e.g., lobby phase).
// Set by the singleton constructors so getManager/getServer work
// before setGameContext is called.
let _fallbackManager: (() => Manager | undefined) | null = null;
let _fallbackServer: (() => Server | undefined) | null = null;

export function setFallbackManager(fn: () => Manager | undefined) {
  _fallbackManager = fn;
}

export function setFallbackServer(fn: () => Server | undefined) {
  _fallbackServer = fn;
}

export function setGameContext(ctx: GameContext | null) {
  _context = ctx;
}

export function getGameContext(): GameContext {
  return _context!;
}

export function getContextOrNull(): GameContext | null {
  return _context;
}

export function getLevel(): Level {
  return _context!.level;
}

export function getManager(): Manager {
  return (_context?.manager ?? _fallbackManager?.()) as Manager;
}

export function getServer(): Server | null {
  return _context?.server ?? _fallbackServer?.() ?? null;
}
