import { describe, expect, test } from "vitest";
import { buildDebris } from "../debris";
import { computeZones } from "../zones";
import { bitmap } from "./helpers";

function debrisFor(
  rows: string[],
  ladders: { left: number; top: number; right: number; bottom: number }[] = [],
  seed = 1
) {
  const { alpha, width, height } = bitmap(rows);
  const { zoneMap, landmassMap, zones } = computeZones(
    alpha,
    width,
    height,
    seed
  );
  const background = buildDebris({
    width,
    height,
    zoneMap,
    landmassMap,
    zones,
    ladders,
    seed,
  });
  return { background, alpha, width, height };
}

const HILL = [
  "..........",
  "....##....",
  "...####...",
  "..######..",
  ".########.",
  "##########",
];

describe("buildDebris", () => {
  test("debris pixels are a strict subset of the original solid pixels", () => {
    const { background, alpha } = debrisFor(HILL);
    const data = background.data;
    for (let i = 0; i < alpha.length; i++) {
      if (data[i * 4 + 3] !== 0) {
        expect(alpha[i]).toBe(1);
      }
    }
  });

  test("debris exists but is smaller than the original terrain", () => {
    const { background, alpha } = debrisFor(HILL);
    const data = background.data;
    let solidCount = 0;
    let debrisCount = 0;
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i]) solidCount++;
      if (data[i * 4 + 3] !== 0) debrisCount++;
    }
    expect(debrisCount).toBeGreaterThan(0);
    expect(debrisCount).toBeLessThan(solidCount);
  });

  test("erosion is capped for deep terrain but the edge stays rough", () => {
    const width = 64;
    const height = 200;
    const rows = Array.from({ length: height }, () => "#".repeat(width));
    const { background } = debrisFor(rows);
    const data = background.data;
    const tops: number[] = [];
    for (let x = 0; x < width; x++) {
      let top = height;
      for (let y = 0; y < height; y++) {
        if (data[(y * width + x) * 4 + 3] !== 0) {
          top = y;
          break;
        }
      }
      // MAX_EROSION_PX = 10: at most 10px may be removed from the top
      expect(top).toBeLessThanOrEqual(10);
      tops.push(top);
    }
    // the capped edge must still vary, not track the silhouette flatly
    expect(new Set(tops).size).toBeGreaterThanOrEqual(3);
  });

  test("all pixels are fully opaque or fully transparent", () => {
    const { background } = debrisFor(HILL);
    const data = background.data;
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i] === 0 || data[i] === 255).toBe(true);
    }
  });

  test("is deterministic for the same seed", () => {
    const a = debrisFor(HILL, [], 9);
    const b = debrisFor(HILL, [], 9);
    expect(Array.from(a.background.data)).toEqual(
      Array.from(b.background.data)
    );
  });

  test("ladders are drawn in empty space with rails and rungs", () => {
    const ladder = { left: 2, top: 0, right: 16, bottom: 24 };
    const rows = [
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "####################",
    ];
    const { background, width } = debrisFor(rows, [ladder]);
    const data = background.data;
    // rail pixel (left edge of the bbox, above the terrain)
    expect(data[(5 * width + 2) * 4 + 3]).toBe(255);
    // rail pixel on the right edge
    expect(data[(5 * width + 15) * 4 + 3]).toBe(255);
    // rung row: top of the bbox is a rung, spanning the middle
    expect(data[(0 * width + 8) * 4 + 3]).toBe(255);
    // between rungs and rails: transparent (y=5 is no rung row, x=8 is no rail)
    expect(data[(5 * width + 8) * 4 + 3]).toBe(0);
  });

  test("pixels outside debris and ladders stay transparent", () => {
    const { background, width } = debrisFor(HILL);
    const data = background.data;
    // top-left corner: empty in the input, far from any ladder
    expect(data[(0 * width + 0) * 4 + 3]).toBe(0);
  });
});
