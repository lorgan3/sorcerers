import { vi } from "vitest";
import { Texture } from "pixi.js";
import { installMockContext, clearMockContext } from "../../__spec__/mockContext";

vi.mock("../../../util/assets/assetsContainer", () => {
  const atlas = {
    textures: new Proxy(
      {},
      {
        get: () => Texture.EMPTY,
      }
    ),
    animations: new Proxy(
      {},
      {
        get: () => [Texture.EMPTY],
      }
    ),
  };

  return {
    AssetsContainer: {
      instance: {
        assets: { atlas },
      },
    },
  };
});

vi.mock("../../../sound/controllableSound", () => ({
  ControllableSound: {
    fromEntity: vi.fn(),
  },
}));

describe("BaseItem high-speed collision", () => {
  let mocks: ReturnType<typeof installMockContext>;

  beforeEach(() => {
    mocks = installMockContext();
  });

  afterEach(() => {
    clearMockContext();
  });

  it("queues a small explosion when the item collides at high speed", async () => {
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const item = new Potion(10, 10, true, PotionType.HealthPotion);
    item.body.addVelocity(15, 0); // |v| = 15, above the explosion threshold

    (item as any).handleHighSpeedCollide(20, 10);

    expect(mocks.server.damage).toHaveBeenCalledTimes(1);
    const damageSource = mocks.server.damage.mock.calls[0][0];
    expect(damageSource.x).toBe(20);
    expect(damageSource.y).toBe(10);
  });

  it("does not queue an explosion below the speed threshold", async () => {
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const item = new Potion(10, 10, true, PotionType.HealthPotion);
    item.body.addVelocity(1, 0); // |v| = 1, far below the explosion threshold

    (item as any).handleHighSpeedCollide(20, 10);

    expect(mocks.server.damage).not.toHaveBeenCalled();
  });

  it("does not throw when there is no server", async () => {
    const { Potion } = await import("../potion");
    const { PotionType } = await import("../potionData");

    const item = new Potion(10, 10, true, PotionType.HealthPotion);
    item.body.addVelocity(15, 0);

    clearMockContext();
    installMockContext();
    // Force a null-server condition by overriding the context's server field.
    const { setGameContext, getGameContext } = await import("../../context");
    const ctx = getGameContext();
    setGameContext({ ...ctx, server: null as any });

    expect(() => (item as any).handleHighSpeedCollide(20, 10)).not.toThrow();
  });
});
