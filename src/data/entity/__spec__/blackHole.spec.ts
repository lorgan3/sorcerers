import { vi } from "vitest";
import { Texture } from "pixi.js";
import { installMockContext, clearMockContext } from "../../__spec__/mockContext";

vi.mock("../../../util/assets/assetsContainer", () => {
  const atlas = {
    textures: new Proxy({}, { get: () => Texture.EMPTY }),
    animations: new Proxy({}, { get: () => [Texture.EMPTY] }),
  };
  return {
    AssetsContainer: { instance: { assets: { atlas } } },
  };
});

vi.mock("../../../sound/controllableSound", () => ({
  ControllableSound: { fromEntity: vi.fn() },
}));

describe("Pocket Black Hole", () => {
  let mocks: ReturnType<typeof installMockContext>;

  beforeEach(() => {
    mocks = installMockContext();
    (mocks.server as any).isEnding = vi.fn().mockReturnValue(false);
  });

  afterEach(() => {
    clearMockContext();
  });

  const tickPastFade = async (hole: any) => {
    const { FADE_DELAY } = await import("../blackHole");
    for (let i = 0; i < FADE_DELAY; i++) {
      hole.tick(1);
    }
  };

  it("pulls a nearby item toward the activation point once the potion has faded", async () => {
    const { BlackHole } = await import("../blackHole");
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const hole = new BlackHole(100, 100, true);
    const item = new Potion(150, 100, true, PotionType.HealthPotion);
    mocks.level.entities.add(item as any);

    const fakeCharacter = {
      getCenter: () => [100 * 6 + 27, 100 * 6 + 27],
      player: { stats: { registerItem: vi.fn() } },
    } as any;
    hole.activate(fakeCharacter);

    await tickPastFade(hole);

    const beforeVx = item.body.xVelocity;
    hole.tick(1);

    expect(item.body.xVelocity).toBeLessThan(beforeVx);
  });

  it("does not pull during the fade-out delay", async () => {
    const { BlackHole } = await import("../blackHole");
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const hole = new BlackHole(100, 100, true);
    const item = new Potion(150, 100, true, PotionType.HealthPotion);
    mocks.level.entities.add(item as any);

    const fakeCharacter = {
      getCenter: () => [100 * 6 + 27, 100 * 6 + 27],
      player: { stats: { registerItem: vi.fn() } },
    } as any;
    hole.activate(fakeCharacter);

    const beforeVx = item.body.xVelocity;
    hole.tick(1);
    expect(item.body.xVelocity).toBe(beforeVx);
  });

  it("applies the same magnitude of pull regardless of distance", async () => {
    const { BlackHole } = await import("../blackHole");
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const hole = new BlackHole(100, 100, true);
    const near = new Potion(110, 100, true, PotionType.HealthPotion);
    const far = new Potion(200, 100, true, PotionType.HealthPotion);
    mocks.level.entities.add(near as any);
    mocks.level.entities.add(far as any);

    const fakeCharacter = {
      getCenter: () => [100 * 6 + 27, 100 * 6 + 27],
      player: { stats: { registerItem: vi.fn() } },
    } as any;
    hole.activate(fakeCharacter);
    await tickPastFade(hole);
    hole.tick(1);

    expect(Math.abs(near.body.xVelocity)).toBeCloseTo(
      Math.abs(far.body.xVelocity),
      5,
    );
  });

  it("stops pulling after FADE_DELAY + PULL_DURATION ticks", async () => {
    const { BlackHole, FADE_DELAY, PULL_DURATION } = await import("../blackHole");
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const hole = new BlackHole(100, 100, true);
    const item = new Potion(150, 100, true, PotionType.HealthPotion);
    mocks.level.entities.add(item as any);

    const fakeCharacter = {
      getCenter: () => [100 * 6 + 27, 100 * 6 + 27],
      player: { stats: { registerItem: vi.fn() } },
    } as any;
    hole.activate(fakeCharacter);

    for (let i = 0; i < FADE_DELAY + PULL_DURATION + 5; i++) {
      hole.tick(1);
    }

    const vBefore = item.body.xVelocity;
    hole.tick(1);
    expect(item.body.xVelocity).toBe(vBefore);
  });
});
