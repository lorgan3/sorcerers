import { vi } from "vitest";
import { GameContext, setGameContext } from "../context";
import { HurtableEntity, TickingEntity } from "../entity/types";

export interface MockLevel {
  terrain: {
    characterMask: {};
    collisionMask: { collidesWith: ReturnType<typeof vi.fn> };
    subtractCircle: ReturnType<typeof vi.fn>;
    draw: ReturnType<typeof vi.fn>;
  };
  entities: Set<TickingEntity>;
  entityMap: Map<number, TickingEntity>;
  hurtables: Set<HurtableEntity>;
  add: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  withNearbyEntities: ReturnType<typeof vi.fn>;
  particleContainer: {
    addEmitter: ReturnType<typeof vi.fn>;
    destroyEmitter: ReturnType<typeof vi.fn>;
  };
}

export interface MockManager {
  getElementValue: ReturnType<typeof vi.fn>;
  setTurnState: ReturnType<typeof vi.fn>;
  getActivePlayer: ReturnType<typeof vi.fn>;
  getActiveCharacter: ReturnType<typeof vi.fn>;
  players: any[];
}

export interface MockServer {
  damage: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  dynamicUpdate: ReturnType<typeof vi.fn>;
  broadcast: ReturnType<typeof vi.fn>;
  getActivePlayer: ReturnType<typeof vi.fn>;
}

export function createMockLevel(): MockLevel {
  return {
    terrain: {
      characterMask: {},
      collisionMask: { collidesWith: vi.fn() },
      subtractCircle: vi.fn(),
      draw: vi.fn(),
    },
    entities: new Set(),
    entityMap: new Map(),
    hurtables: new Set(),
    add: vi.fn(),
    remove: vi.fn(),
    withNearbyEntities: vi.fn(),
    particleContainer: {
      addEmitter: vi.fn(),
      destroyEmitter: vi.fn(),
    },
  };
}

export function createMockManager(): MockManager {
  return {
    getElementValue: vi.fn().mockReturnValue(1),
    setTurnState: vi.fn(),
    getActivePlayer: vi.fn(),
    getActiveCharacter: vi.fn(),
    players: [],
  };
}

export function createMockServer(): MockServer {
  return {
    damage: vi.fn(),
    kill: vi.fn(),
    create: vi.fn(),
    dynamicUpdate: vi.fn(),
    broadcast: vi.fn(),
    getActivePlayer: vi.fn(),
  };
}

export function createMockContext() {
  const level = createMockLevel();
  const manager = createMockManager();
  const server = createMockServer();

  const ctx: GameContext = {
    level: level as unknown as GameContext["level"],
    manager: manager as unknown as GameContext["manager"],
    server: server as unknown as GameContext["server"],
  };

  return { ctx, level, manager, server };
}

export function installMockContext() {
  const mocks = createMockContext();
  setGameContext(mocks.ctx);
  return mocks;
}

export function clearMockContext() {
  setGameContext(null);
}
