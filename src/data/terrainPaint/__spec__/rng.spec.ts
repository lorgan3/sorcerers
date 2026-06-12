import { describe, expect, test } from "vitest";
import { noise2d } from "../rng";

describe("noise2d", () => {
  test("is position-stable regardless of evaluation order", () => {
    const first = noise2d(5, 17, 23);
    noise2d(5, 99, 99);
    noise2d(5, 0, 0);
    expect(noise2d(5, 17, 23)).toBe(first);
  });

  test("varies across coordinates and seeds", () => {
    const values = new Set<number>();
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        values.add(noise2d(1, x, y));
      }
    }
    expect(values.size).toBeGreaterThan(90);
    expect(noise2d(1, 3, 4)).not.toBe(noise2d(2, 3, 4));
  });

  test("values are in [0, 1)", () => {
    for (let i = 0; i < 500; i++) {
      const v = noise2d(3, i * 13, i * 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const zero = noise2d(0, 0, 0);
    expect(zero).toBeGreaterThan(0);
    expect(zero).toBeLessThan(1);
  });
});
