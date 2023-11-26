import { assertNumber } from "../number";
import { describe, it, expect } from "vitest";

describe("number", () => {
  describe("assertNumber", () => {
    it("handles garbage input", () => {
      expect(assertNumber("foobar")).toEqual(0);
      expect(assertNumber("foobar", 10, 20)).toEqual(10);
    });

    it("handles too low values", () => {
      expect(assertNumber(-20, 1, 5)).toEqual(1);
    });

    it("handles too high values", () => {
      expect(assertNumber(20, 1, 5)).toEqual(5);
    });

    it("accepts valid numbers", () => {
      expect(assertNumber(3, 1, 5)).toEqual(3);
      expect(assertNumber(420)).toEqual(420);
      expect(assertNumber(1e3)).toEqual(1000);
      expect(assertNumber(-9999)).toEqual(-9999);
    });
  });
});
