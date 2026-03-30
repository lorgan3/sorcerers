import { describe, it, expect } from "vitest";
import { minutesToMs, secondsToMs } from "../time";

describe("time", () => {
  describe("minutesToMs", () => {
    it("converts 1 minute to 60000ms", () => {
      expect(minutesToMs(1)).toBe(60000);
    });

    it("converts 0 minutes to 0ms", () => {
      expect(minutesToMs(0)).toBe(0);
    });

    it("handles fractional minutes", () => {
      expect(minutesToMs(0.5)).toBe(30000);
    });
  });

  describe("secondsToMs", () => {
    it("converts 1 second to 1000ms", () => {
      expect(secondsToMs(1)).toBe(1000);
    });

    it("converts 0 seconds to 0ms", () => {
      expect(secondsToMs(0)).toBe(0);
    });
  });
});
