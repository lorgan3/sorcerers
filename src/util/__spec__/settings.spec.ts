import { describe, it, expect } from "vitest";
import { defaults, settingsReviver } from "../localStorage/settings";

describe("settings", () => {
  describe("defaults", () => {
    it("defaults isPublic to false when no settings stored", () => {
      const s = defaults();
      expect(s.gameSettings.isPublic).toBe(false);
    });

    it("preserves isPublic when stored as true", () => {
      const s = defaults({ gameSettings: { isPublic: true } as any });
      expect(s.gameSettings.isPublic).toBe(true);
    });
  });

  describe("settingsReviver", () => {
    it("coerces non-boolean isPublic to false", () => {
      expect(settingsReviver("isPublic", "yes")).toBe(false);
      expect(settingsReviver("isPublic", 1)).toBe(false);
      expect(settingsReviver("isPublic", null)).toBe(false);
    });

    it("preserves boolean isPublic", () => {
      expect(settingsReviver("isPublic", true)).toBe(true);
      expect(settingsReviver("isPublic", false)).toBe(false);
    });
  });
});
