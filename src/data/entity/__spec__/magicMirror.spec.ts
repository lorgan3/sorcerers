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

describe("Magic Mirror", () => {
  let mocks: ReturnType<typeof installMockContext>;

  beforeEach(() => {
    mocks = installMockContext();
  });

  afterEach(() => {
    clearMockContext();
  });

  it("reverses an ASCII name", async () => {
    const { reverseName } = await import("../magicMirror");
    expect(reverseName("John")).toBe("nhoJ");
  });

  it("returns same-string reversal for palindrome and empty cases", async () => {
    const { reverseName } = await import("../magicMirror");
    expect(reverseName("Anna")).toBe("annA");
    expect(reverseName("")).toBe("");
  });

  const makeFakeCharacter = (initialHp: number, xVelocity: number) => {
    let hp = initialHp;
    const addVelocity = vi.fn();
    const fakeCharacter: any = {
      get hp() {
        return hp;
      },
      set hp(v: number) {
        hp = v;
      },
      silentSetHp(v: number) {
        hp = v;
      },
      health: {
        get hp() {
          return hp;
        },
        set hp(v: number) {
          hp = v;
        },
        silentSet(v: number) {
          hp = v;
        },
      },
      body: {
        precisePosition: [10, 10],
        xVelocity,
        addVelocity,
      },
      characterName: "John",
      getCenter: () => [60, 60],
      player: {
        stats: { registerItem: vi.fn() },
        characters: [] as any[],
        addCharacter(c: any) {
          this.characters.push(c);
        },
      },
    };
    fakeCharacter.player.characters.push(fakeCharacter);
    return { fakeCharacter, addVelocity, getHp: () => hp };
  };

  it("sets the activator HP to 60% of the original on activate", async () => {
    const { MagicMirror } = await import("../magicMirror");

    // Clear the server so the per-peer branch is exercised without
    // attempting the server-only Character construction.
    const { setGameContext, getGameContext } = await import("../../context");
    const ctx = getGameContext();
    setGameContext({ ...ctx, server: null as any });

    const mirror = new MagicMirror(10, 10, true);
    const { fakeCharacter, addVelocity, getHp } = makeFakeCharacter(100, 0);

    mirror.activate(fakeCharacter);

    expect(getHp()).toBe(60);
    expect(addVelocity).toHaveBeenCalled();
  });

  it("pushes a rightward-moving activator further right", async () => {
    const { MagicMirror } = await import("../magicMirror");

    const { setGameContext, getGameContext } = await import("../../context");
    setGameContext({ ...getGameContext(), server: null as any });

    const mirror = new MagicMirror(10, 10, true);
    const { fakeCharacter, addVelocity } = makeFakeCharacter(100, 1.5);

    mirror.activate(fakeCharacter);

    // First addVelocity call is the activator's nudge; x component should be
    // positive (matching the +1 sign of xVelocity).
    expect(addVelocity.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it("pushes a leftward-moving activator further left", async () => {
    const { MagicMirror } = await import("../magicMirror");

    const { setGameContext, getGameContext } = await import("../../context");
    setGameContext({ ...getGameContext(), server: null as any });

    const mirror = new MagicMirror(10, 10, true);
    const { fakeCharacter, addVelocity } = makeFakeCharacter(100, -1.5);

    mirror.activate(fakeCharacter);

    expect(addVelocity.mock.calls[0][0]).toBeLessThan(0);
  });

  it("does not throw when activated without a character", async () => {
    const { MagicMirror } = await import("../magicMirror");

    const mirror = new MagicMirror(10, 10, true);

    expect(() => mirror.activate()).not.toThrow();
  });
});
