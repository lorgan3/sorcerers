import { vi } from "vitest";
import { Texture } from "pixi.js";
import {
  installMockContext,
  clearMockContext,
} from "../../__spec__/mockContext";

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

describe("Chaos Crystal", () => {
  let mocks: ReturnType<typeof installMockContext>;

  beforeEach(() => {
    mocks = installMockContext();
    (mocks.server as any).triggerSuddenDeath = vi.fn();
  });

  afterEach(() => {
    clearMockContext();
  });

  it("calls server.triggerSuddenDeath when activated on the server", async () => {
    const { ChaosCrystal } = await import("../chaosCrystal");

    const crystal = new ChaosCrystal(10, 10, true);
    const fakeCharacter = {
      getCenter: () => [0, 0],
      player: { stats: { registerItem: vi.fn() } },
    } as any;

    crystal.activate(fakeCharacter);

    expect((mocks.server as any).triggerSuddenDeath).toHaveBeenCalledTimes(1);
  });

  it("does not throw when there is no server", async () => {
    const { ChaosCrystal } = await import("../chaosCrystal");

    const crystal = new ChaosCrystal(10, 10, true);

    // Clear the server but keep the level so the constructor succeeds.
    const { setGameContext, getGameContext } = await import("../../context");
    const ctx = getGameContext();
    setGameContext({ ...ctx, server: null as any });

    expect(() => crystal.activate()).not.toThrow();
  });
});
