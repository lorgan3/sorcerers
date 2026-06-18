import { describe, expect, test } from "vitest";
import { buildDefaultMask } from "../mask";

describe("buildDefaultMask", () => {
  test("has the right length", () => {
    expect(buildDefaultMask(10, 4)).toHaveLength(40);
  });

  test("height 4: bottom row solid, row above half, top two empty", () => {
    const mask = buildDefaultMask(2, 4); // band = round(0.8) = 1
    const rows = [0, 1, 2, 3].map((y) => [mask[y * 2], mask[y * 2 + 1]]);
    expect(rows[0]).toEqual([0, 0]);
    expect(rows[1]).toEqual([0, 0]);
    expect(rows[2]).toEqual([128, 128]);
    expect(rows[3]).toEqual([255, 255]);
  });

  test("height 10: bottom 2 rows solid, next 2 rows half, rest empty", () => {
    const w = 3;
    const mask = buildDefaultMask(w, 10); // band = 2
    const rowValue = (y: number) => mask[y * w];
    expect([8, 9].map(rowValue)).toEqual([255, 255]);
    expect([6, 7].map(rowValue)).toEqual([128, 128]);
    expect([0, 1, 2, 3, 4, 5].map(rowValue)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
