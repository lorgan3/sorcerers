import { describe, it, expect } from "vitest";
import { defaults, settingsReviver } from "../localStorage/settings";

describe("settings", () => {
  describe("defaults", () => {
    it("defaults isPrivate to false (public) when no settings stored", () => {
      const s = defaults();
      expect(s.gameSettings.isPrivate).toBe(false);
    });

    it("preserves isPrivate when stored as true", () => {
      const s = defaults({ gameSettings: { isPrivate: true } as any });
      expect(s.gameSettings.isPrivate).toBe(true);
    });
  });

  describe("settingsReviver", () => {
    it("coerces non-boolean isPrivate to false", () => {
      expect(settingsReviver("isPrivate", "yes")).toBe(false);
      expect(settingsReviver("isPrivate", 1)).toBe(false);
      expect(settingsReviver("isPrivate", null)).toBe(false);
    });

    it("preserves boolean isPrivate", () => {
      expect(settingsReviver("isPrivate", true)).toBe(true);
      expect(settingsReviver("isPrivate", false)).toBe(false);
    });
  });
});
