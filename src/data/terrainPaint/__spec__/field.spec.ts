import { describe, expect, test } from "vitest";
import { computeField } from "../field";
import { bitmap } from "./helpers";

describe("computeField depth", () => {
  test("empty pixels have depth 0", () => {
    const { alpha, width, height } = bitmap([".....", ".....", "....."]);
    const { depth } = computeField(alpha, width, height);
    for (let i = 0; i < depth.length; i++) {
      expect(depth[i]).toBe(0);
    }
  });

  test("depth grows toward the center of a blob", () => {
    const { alpha, width, height } = bitmap([
      ".....",
      ".###.",
      ".###.",
      ".###.",
      ".....",
    ]);
    const { depth } = computeField(alpha, width, height);
    // ring pixels are 1px from empty, the center is 2px
    expect(depth[1 * width + 1]).toBe(1);
    expect(depth[2 * width + 2]).toBe(2);
  });

  test("diagonal steps cost 4/3 (chamfer 3-4)", () => {
    const { alpha, width, height } = bitmap([".####", "#####", "#####"]);
    const { depth } = computeField(alpha, width, height);
    // (1,1)'s only nearby empty pixel is (0,0), one diagonal step away
    expect(depth[1 * width + 1]).toBeCloseTo(4 / 3);
  });

  test("out-of-bounds counts as solid (no empty influence past the border)", () => {
    const { alpha, width, height } = bitmap(["#####", "#####", "#####"]);
    const { depth } = computeField(alpha, width, height);
    // fully solid map: no empty pixel anywhere, all depths stay huge
    for (let i = 0; i < depth.length; i++) {
      expect(depth[i]).toBeGreaterThan(width + height);
    }
  });
});

describe("computeField sky", () => {
  test("counts pixels up to the first empty pixel in the column", () => {
    const { alpha, width, height } = bitmap([".", "#", "#", "#"]);
    const { sky } = computeField(alpha, width, height);
    expect(sky[0]).toBe(0); // empty
    expect(sky[1 * width]).toBe(1);
    expect(sky[2 * width]).toBe(2);
    expect(sky[3 * width]).toBe(3);
  });

  test("columns solid from the top edge have huge sky distance", () => {
    const { alpha, width, height } = bitmap(["#", "#"]);
    const { sky } = computeField(alpha, width, height);
    expect(sky[0]).toBeGreaterThan(height);
    expect(sky[width]).toBeGreaterThan(height);
  });

  test("sky resets below an overhang gap", () => {
    const { alpha, width, height } = bitmap(["#", ".", "#"]);
    const { sky } = computeField(alpha, width, height);
    expect(sky[1 * width]).toBe(0); // the gap
    expect(sky[2 * width]).toBe(1); // restarts below the gap
  });
});
