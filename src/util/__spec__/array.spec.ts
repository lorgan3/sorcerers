import { describe, it, expect, vi, afterEach } from "vitest";
import { getRandom } from "../array";

describe("array", () => {
  describe("getRandom", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns first element when Math.random returns 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(getRandom([10, 20, 30])).toBe(10);
    });

    it("returns last element when Math.random returns 0.999", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.999);
      expect(getRandom([10, 20, 30])).toBe(30);
    });

    it("returns the only element of a single-element array", () => {
      expect(getRandom([42])).toBe(42);
    });
  });
});
