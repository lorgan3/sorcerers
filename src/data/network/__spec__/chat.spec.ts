import { describe, it, expect, vi } from "vitest";

vi.mock("../../context", () => ({
  getContextOrNull: () => null,
  setFallbackManager: vi.fn(),
  getLevel: vi.fn(),
}));

import { Manager } from "../manager";
import { ChatEntry } from "../types";
import { Character } from "../../entity/character";

class TestManager extends Manager {
  dealFallDamage(): void {}
  isTrusted(_: Character): boolean {
    return true;
  }
  sendChat(text: string): void {
    this.appendChat("Tester", "#ffffff", text, true);
  }
  publicAppend(author: string, color: string, text: string, byMe: boolean) {
    this.appendChat(author, color, text, byMe);
  }
}

describe("Manager.appendChat", () => {
  it("assigns incrementing ids and pushes entries in order", () => {
    const m = new TestManager();
    m.publicAppend("Alice", "#ff0000", "hello", false);
    m.publicAppend("Bob", "#00ff00", "hi", false);

    expect(m.chatLog.value).toHaveLength(2);
    expect(m.chatLog.value[0]).toMatchObject({
      author: "Alice",
      color: "#ff0000",
      text: "hello",
    });
    expect(m.chatLog.value[1].id).toBe(m.chatLog.value[0].id + 1);
  });

  it("caps history at 200 entries (oldest dropped)", () => {
    const m = new TestManager();
    for (let i = 0; i < 205; i++) {
      m.publicAppend("U", "#fff", `msg ${i}`, false);
    }
    expect(m.chatLog.value).toHaveLength(200);
    expect(m.chatLog.value[0].text).toBe("msg 5");
    expect(m.chatLog.value[199].text).toBe("msg 204");
  });

  it("invokes onChatMessage hook with byMe flag", () => {
    const m = new TestManager();
    const calls: Array<[ChatEntry, boolean]> = [];
    m.onChatMessage = (entry, byMe) => calls.push([entry, byMe]);

    m.publicAppend("Alice", "#f00", "hi", false);
    m.publicAppend("Me", "#0f0", "hi back", true);

    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe(false);
    expect(calls[1][1]).toBe(true);
    expect(calls[1][0].text).toBe("hi back");
  });
});
