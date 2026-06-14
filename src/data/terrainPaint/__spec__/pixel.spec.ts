import { describe, expect, test } from "vitest";
import { createImageData, hexToRgb, pickZone, rampIndex } from "../pixel";

describe("hexToRgb", () => {
  test("parses hex colors", () => {
    expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("#8bc34a")).toEqual([139, 195, 74]);
  });
});

describe("createImageData", () => {
  test("creates a zeroed buffer of the right size", () => {
    const img = createImageData(3, 2);
    expect(img.width).toBe(3);
    expect(img.height).toBe(2);
    expect(img.data.length).toBe(3 * 2 * 4);
    expect(Array.from(img.data).every((v) => v === 0)).toBe(true);
  });

  test("falls back to a plain shape when ImageData is unavailable", () => {
    const orig = (globalThis as any).ImageData;
    delete (globalThis as any).ImageData;
    try {
      const img = createImageData(4, 2);
      expect(img.width).toBe(4);
      expect(img.height).toBe(2);
      expect(img.data.length).toBe(32);
    } finally {
      (globalThis as any).ImageData = orig;
    }
  });
});

describe("rampIndex", () => {
  const band = { ramp: ["#aaaaaa", "#888888", "#666666"] };

  test("maps band position to ramp index, light to dark", () => {
    // collect indices across many positions per t bucket; dither shifts
    // by at most 1, so the median must land on the base index
    for (const [t, expected] of [
      [0.1, 0],
      [0.5, 1],
      [0.9, 2],
    ] as const) {
      const indices: number[] = [];
      for (let x = 0; x < 50; x++) {
        indices.push(rampIndex(band, t, x, 7, 1));
      }
      indices.sort((a, b) => a - b);
      expect(indices[25]).toBe(expected);
      for (const idx of indices) {
        expect(Math.abs(idx - expected)).toBeLessThanOrEqual(1);
      }
    }
  });

  test("stays within ramp bounds", () => {
    for (let x = 0; x < 100; x++) {
      for (const t of [0, 0.33, 0.66, 0.999, 1, 1.5]) {
        const idx = rampIndex(band, t, x, x * 3, 42);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(band.ramp.length);
      }
    }
  });

  test("applies the band pattern after dithering", () => {
    const patterned = {
      ramp: ["#aaaaaa", "#888888"],
      pattern: () => 0,
    };
    for (let x = 0; x < 20; x++) {
      expect(rampIndex(patterned, 0.9, x, 0, 1)).toBe(0);
    }
  });
});

describe("pickZone", () => {
  test("returns the pixel's own zone away from seams", () => {
    // one big zone: jitter can never escape it
    const width = 64;
    const height = 64;
    const zoneMap = new Int32Array(width * height).fill(0);
    expect(pickZone(zoneMap, width, height, 32, 32, 1)).toBe(0);
  });

  test("never returns -1 for a solid pixel even when jitter lands on empty", () => {
    const width = 32;
    const height = 32;
    const zoneMap = new Int32Array(width * height).fill(-1);
    // only one solid pixel; all jitter targets are empty
    zoneMap[16 * width + 16] = 3;
    expect(pickZone(zoneMap, width, height, 16, 16, 1)).toBe(3);
  });

  test("is deterministic per position and seed", () => {
    const width = 32;
    const height = 32;
    const zoneMap = new Int32Array(width * height);
    for (let i = 0; i < zoneMap.length; i++) {
      zoneMap[i] = i % width < 16 ? 0 : 1;
    }
    for (let x = 10; x < 22; x++) {
      expect(pickZone(zoneMap, width, height, x, 5, 7)).toBe(
        pickZone(zoneMap, width, height, x, 5, 7)
      );
    }
  });

  test("clamps jitter to the pixel's own landmass when a map is given", () => {
    // two adjacent landmasses meeting at x=16, each one solid zone. Within
    // SEAM_JITTER (8px) a left-side pixel's jitter can reach the right zone.
    const width = 32;
    const height = 32;
    const zoneMap = new Int32Array(width * height);
    const landmassMap = new Int32Array(width * height);
    for (let i = 0; i < zoneMap.length; i++) {
      const right = i % width >= 16;
      zoneMap[i] = right ? 1 : 0;
      landmassMap[i] = right ? 1 : 0;
    }

    // baseline: without the landmass map, jitter bleeds the right zone across
    let bledWithoutMap = false;
    for (let x = 10; x < 16; x++) {
      for (let y = 0; y < height; y++) {
        if (pickZone(zoneMap, width, height, x, y, 7) === 1) bledWithoutMap = true;
      }
    }
    expect(bledWithoutMap).toBe(true);

    // with the map, a left-landmass pixel never adopts the right zone
    for (let x = 10; x < 16; x++) {
      for (let y = 0; y < height; y++) {
        expect(pickZone(zoneMap, width, height, x, y, 7, landmassMap)).toBe(0);
      }
    }
  });
});
