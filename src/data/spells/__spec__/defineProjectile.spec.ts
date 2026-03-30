import { vi } from "vitest";
import { Sound } from "../../../sound";
import { EntityType, Priority } from "../../entity/types";
import { Element } from "../types";

// --- Mocks ---

// Mock pixi.js — provide all symbols that may be imported transitively
vi.mock("pixi.js", () => {
  class Container {
    position = {
      x: 0,
      y: 0,
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
      },
    };
    children: any[] = [];
    addChild(child: any) {
      this.children.push(child);
    }
  }

  class AnimatedSprite {
    animationSpeed = 0;
    rotation = 0;
    alpha = 1;
    currentFrame = 0;
    totalFrames = 8;
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    position = { set: vi.fn() };
    play = vi.fn();
  }

  class Sprite {
    position = { x: 0, y: 0, set: vi.fn() };
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    rotation = 0;
    alpha = 1;
    texture = null;
    addChild = vi.fn();
  }

  class Graphics {
    clear = vi.fn().mockReturnThis();
    beginFill = vi.fn().mockReturnThis();
    drawCircle = vi.fn().mockReturnThis();
    endFill = vi.fn().mockReturnThis();
    position = { x: 0, y: 0, set: vi.fn() };
  }

  class BitmapText {
    position = { x: 0, y: 0, set: vi.fn() };
    text = "";
    anchor = { set: vi.fn() };
  }

  class TilingSprite {
    position = { x: 0, y: 0 };
    tilePosition = { x: 0, y: 0 };
  }

  class Texture {
    static from = vi.fn().mockReturnValue({});
    static WHITE = {};
    static EMPTY = {};
  }

  const UPDATE_PRIORITY = { NORMAL: 0, HIGH: 1, LOW: -1 };
  const TextureStyle = {};

  class Application {
    stage = new Container();
    ticker = { add: vi.fn(), remove: vi.fn() };
    renderer = { resize: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
  }

  class Rectangle {
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0
    ) {}
  }

  class Ticker {
    add = vi.fn();
    remove = vi.fn();
    start = vi.fn();
    stop = vi.fn();
    static shared = { add: vi.fn(), remove: vi.fn() };
  }

  const FederatedPointerEvent = class {};
  const FederatedWheelEvent = class {};

  return {
    Container,
    AnimatedSprite,
    Sprite,
    Graphics,
    BitmapText,
    TilingSprite,
    Texture,
    Application,
    Rectangle,
    Ticker,
    UPDATE_PRIORITY,
    TextureStyle,
    FederatedPointerEvent,
    FederatedWheelEvent,
  };
});

// Mock AssetsContainer
vi.mock("../../../util/assets/assetsContainer", () => {
  return {
    AssetsContainer: {
      instance: {
        assets: {
          atlas: {
            animations: {
              fireball: [{}],
              default: [{}],
            },
          },
        },
      },
    },
  };
});

// Mock ControllableSound
vi.mock("../../../sound/controllableSound", () => {
  return {
    ControllableSound: {
      fromEntity: vi.fn(),
    },
  };
});

// Mock graphics
vi.mock("../../../graphics/explosion", () => ({
  Explosion: vi.fn(),
}));

vi.mock("../../../graphics/acidSplash", () => ({
  AcidSplash: vi.fn(),
}));

vi.mock("../../../graphics/iceImpact", () => ({
  IceImpact: vi.fn(),
}));

// Mock SimpleParticleEmitter
vi.mock("../../../graphics/particles/simpleParticleEmitter", () => ({
  SimpleParticleEmitter: vi.fn(),
}));

// Mock SimpleBody
const mockBody = {
  move: vi.fn(),
  addAngularVelocity: vi.fn(),
  tick: vi.fn(),
  precisePosition: [10, 20] as [number, number],
  velocity: 5,
  direction: 1.5,
  mask: {},
  serialize: vi.fn().mockReturnValue([10, 20, 1, 0]),
  deserialize: vi.fn(),
};

vi.mock("../../collision/simpleBody", () => {
  return {
    SimpleBody: vi.fn().mockImplementation(() => mockBody),
  };
});

// Mock context
const mockGetServer = vi.fn();
const mockGetManager = vi.fn();
const mockGetLevel = vi.fn();

vi.mock("../../context", () => ({
  getServer: () => mockGetServer(),
  getManager: () => mockGetManager(),
  getLevel: () => mockGetLevel(),
}));

// Mock spell utils
vi.mock("../utils", () => ({
  applyExplosiveDamage: vi.fn(),
  applyImpactDamage: vi.fn(),
  applyFallDamage: vi.fn(),
  castProjectile: vi.fn().mockImplementation((factory: any) => {
    const mockMask = {};
    return factory(mockMask);
  }),
  createParticles: vi.fn().mockReturnValue(null),
}));

// --- Import after mocks ---
import { defineProjectile } from "../defineProjectile";

// --- Helpers ---

function createMinimalConfig(overrides: any = {}) {
  return {
    type: EntityType.Fireball,
    body: {
      mask: {} as any,
      friction: 0.98,
      gravity: 0.3,
    },
    sprite: {
      animation: "fireball",
      animationSpeed: 0.2,
      anchor: [0.5, 0.5] as [number, number],
    },
    lifetime: 100,
    damage: {
      type: "explosive" as const,
      radius: 10,
      intensity: 5,
      base: 20,
      element: Element.Physical,
      multiplier: 1,
    },
    deathEffect: "explosion" as const,
    cast: {
      speed: 2,
    },
    ...overrides,
  };
}

function createMockLevel() {
  return {
    terrain: {
      characterMask: {},
      collisionMask: { collidesWith: vi.fn() },
    },
    remove: vi.fn(),
    add: vi.fn(),
    particleContainer: {
      destroyEmitter: vi.fn(),
    },
  };
}

function createMockServer() {
  return {
    kill: vi.fn(),
    create: vi.fn(),
    dynamicUpdate: vi.fn(),
  };
}

function createMockManager() {
  return {
    setTurnState: vi.fn(),
  };
}

// --- Tests ---

describe("defineProjectile", () => {
  let mockLevel: ReturnType<typeof createMockLevel>;
  let mockServer: ReturnType<typeof createMockServer>;
  let mockManager: ReturnType<typeof createMockManager>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLevel = createMockLevel();
    mockServer = createMockServer();
    mockManager = createMockManager();

    mockGetLevel.mockReturnValue(mockLevel);
    mockGetServer.mockReturnValue(mockServer);
    mockGetManager.mockReturnValue(mockManager);

    // Reset precisePosition to known values
    mockBody.precisePosition = [10, 20];
    mockBody.velocity = 5;
    mockBody.direction = 1.5;
  });

  describe("factory shape", () => {
    it("returns an object with create and cast methods", () => {
      const factory = defineProjectile(createMinimalConfig());

      expect(factory).toHaveProperty("create");
      expect(factory).toHaveProperty("cast");
      expect(typeof factory.create).toBe("function");
      expect(typeof factory.cast).toBe("function");
    });
  });

  describe("create", () => {
    it("produces an entity with correct type", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);

      expect((entity as any).type).toBe(EntityType.Fireball);
    });

    it("produces an entity with correct id initialized to -1", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);

      expect(entity.id).toBe(-1);
    });

    it("produces an entity with all required interface methods", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);

      expect(typeof (entity as any).tick).toBe("function");
      expect(typeof (entity as any).die).toBe("function");
      expect(typeof (entity as any).getCenter).toBe("function");
      expect(typeof (entity as any).serialize).toBe("function");
      expect(typeof (entity as any).deserialize).toBe("function");
      expect(typeof (entity as any).serializeCreate).toBe("function");
    });

    it("defaults priority to Priority.Dynamic when not specified", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);

      expect((entity as any).priority).toBe(Priority.Dynamic);
    });

    it("uses specified priority when provided", () => {
      const factory = defineProjectile(
        createMinimalConfig({ priority: Priority.High })
      );
      const entity = factory.create([10, 20, 5, 1.5]);

      expect((entity as any).priority).toBe(Priority.High);
    });
  });

  describe("serializeCreate", () => {
    it("returns [x, y, velocity, direction] from the body", () => {
      mockBody.precisePosition = [10, 20];
      mockBody.velocity = 5;
      mockBody.direction = 1.5;

      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);
      const result = (entity as any).serializeCreate();

      expect(result[0]).toBe(10); // x
      expect(result[1]).toBe(20); // y
      expect(result[2]).toBe(5);  // velocity
      expect(result[3]).toBe(1.5); // direction
    });
  });

  describe("getCenter", () => {
    it("returns position when no centerOffset is specified", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);

      // Position is set as bx * 6, by * 6 = 10*6=60, 20*6=120
      const center = (entity as any).getCenter();
      expect(center[0]).toBe(60); // x = 10 * 6
      expect(center[1]).toBe(120); // y = 20 * 6
    });

    it("applies centerOffset when specified", () => {
      const factory = defineProjectile(
        createMinimalConfig({ centerOffset: [5, 10] })
      );
      const entity = factory.create([10, 20, 5, 1.5]);

      const center = (entity as any).getCenter();
      expect(center[0]).toBe(65);  // 60 + 5
      expect(center[1]).toBe(130); // 120 + 10
    });
  });

  describe("serialize / deserialize", () => {
    it("serialize delegates to body.serialize()", () => {
      mockBody.serialize.mockReturnValue([10, 20, 1, 0]);

      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);
      const result = (entity as any).serialize();

      expect(mockBody.serialize).toHaveBeenCalled();
      expect(result).toEqual([10, 20, 1, 0]);
    });

    it("deserialize delegates to body.deserialize()", () => {
      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([10, 20, 5, 1.5]);
      const data = [10, 20, 1, 0];
      (entity as any).deserialize(data);

      expect(mockBody.deserialize).toHaveBeenCalledWith(data);
    });
  });

  describe("cast", () => {
    it("computes speed as power * multiplier when cast.speed is a number", async () => {
      const { castProjectile } = await import("../utils");
      const factory = defineProjectile(createMinimalConfig({ cast: { speed: 3 } }));

      factory.cast(10, 20, {} as any, 0.5, 1.0);

      // castProjectile is called with a factory function
      expect(castProjectile).toHaveBeenCalled();
      // SimpleBody should have been called with the entity created
      const { SimpleBody } = await import("../../collision/simpleBody");
      // Check addAngularVelocity was called with speed = power * multiplier = 0.5 * 3 = 1.5
      expect(mockBody.addAngularVelocity).toHaveBeenCalledWith(1.5, 1.0);
    });

    it("computes speed via function when cast.speed is a function", async () => {
      const speedFn = vi.fn().mockReturnValue(7);
      const factory = defineProjectile(
        createMinimalConfig({ cast: { speed: speedFn } })
      );

      factory.cast(10, 20, {} as any, 0.5, 1.0);

      expect(speedFn).toHaveBeenCalledWith(0.5);
      expect(mockBody.addAngularVelocity).toHaveBeenCalledWith(7, 1.0);
    });
  });

  describe("tick", () => {
    it("calls body.tick(dt) and updates position", () => {
      mockBody.precisePosition = [15, 25];

      const factory = defineProjectile(createMinimalConfig());
      const entity = factory.create([15, 25, 5, 1.0]);
      (entity as any).tick(16);

      expect(mockBody.tick).toHaveBeenCalledWith(16);
      // Position should be updated: bx * 6 = 15 * 6 = 90, by * 6 = 25 * 6 = 150
      expect((entity as any).position.x).toBe(90);
      expect((entity as any).position.y).toBe(150);
    });
  });
});
