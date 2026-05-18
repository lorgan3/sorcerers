import { vi } from "vitest";
import {
  installMockContext,
  clearMockContext,
} from "../../__spec__/mockContext";

describe("Server.triggerSuddenDeath", () => {
  let mocks: ReturnType<typeof installMockContext>;
  let server: any;

  beforeEach(async () => {
    mocks = installMockContext();
    (mocks.level as any).sink = vi.fn().mockReturnValue(42);

    const { Server } = await import("../server");
    (Server as any)._serverInstance = undefined;
    server = new (Server as any)();
    server.settings = { gameLength: 10 }; // minutes
    server.time = 30 * 1000; // 30 seconds into the game
    server.turnStartTime = 20 * 1000; // 10 seconds into the active turn
    server.suddenDeath = false;
    server.broadcast = vi.fn();
    server.addPopup = vi.fn();
  });

  afterEach(() => {
    server?.destroy?.();
    clearMockContext();
  });

  it("flips suddenDeath, advances time, popups, and broadcasts a sink", () => {
    const turnElapsedBefore = server.time - server.turnStartTime;

    server.triggerSuddenDeath();

    expect(server.suddenDeath).toBe(true);
    expect(server.time).toBeGreaterThanOrEqual(10 * 60 * 1000);
    // turnStartTime must advance by the same delta so the active turn does
    // not get ended by the time bump.
    expect(server.time - server.turnStartTime).toBe(turnElapsedBefore);
    expect(server.addPopup).toHaveBeenCalledWith({ title: "Sudden death!" });
    expect((mocks.level as any).sink).toHaveBeenCalledTimes(1);
    expect(server.broadcast).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when sudden death is already active", () => {
    server.suddenDeath = true;
    server.time = 9 * 60 * 1000;

    server.triggerSuddenDeath();

    expect(server.time).toBe(9 * 60 * 1000);
    expect(server.addPopup).not.toHaveBeenCalled();
    expect(server.broadcast).not.toHaveBeenCalled();
    expect((mocks.level as any).sink).not.toHaveBeenCalled();
  });
});
