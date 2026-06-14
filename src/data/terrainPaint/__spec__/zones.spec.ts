import { describe, expect, test } from "vitest";
import { computeZones, MAX_ZONE_WIDTH } from "../zones";
import { THEME_IDS } from "../palettes";
import { bitmap } from "./helpers";

describe("computeZones", () => {
  test("two islands become two zones with distinct labels", () => {
    const { alpha, width, height } = bitmap([
      "##..##",
      "##..##",
      "......",
    ]);
    const { zoneMap, zones } = computeZones(alpha, width, height, 1);
    expect(zones).toHaveLength(2);
    expect(zoneMap[0]).not.toBe(zoneMap[4]);
    expect(zoneMap[2]).toBe(-1); // empty pixel
    // bboxes are refined to actual pixels (right/bottom exclusive)
    const left = zones.find((z) => z.id === zoneMap[0])!;
    expect(left.bbox).toEqual({ left: 0, top: 0, right: 2, bottom: 2 });
  });

  test("an empty map yields zero zones", () => {
    const { alpha, width, height } = bitmap(["....", "...."]);
    const { zones } = computeZones(alpha, width, height, 1);
    expect(zones).toHaveLength(0);
  });

  test("a landmass wider than MAX_ZONE_WIDTH is split", () => {
    const width = MAX_ZONE_WIDTH * 2 + 100;
    const height = 4;
    const alpha = new Uint8Array(width * height).fill(1);
    const { zones } = computeZones(alpha, width, height, 1);
    expect(zones.length).toBe(3); // ceil(2020 / 960)
  });

  test("same seed gives identical zones and themes; output is deterministic", () => {
    const width = MAX_ZONE_WIDTH + 200;
    const height = 8;
    const alpha = new Uint8Array(width * height).fill(1);
    const a = computeZones(alpha, width, height, 5);
    const b = computeZones(alpha, width, height, 5);
    expect(Array.from(a.zoneMap)).toEqual(Array.from(b.zoneMap));
    expect(a.zones).toEqual(b.zones);
  });

  test("zones default to grassland", () => {
    const width = MAX_ZONE_WIDTH * 3;
    const height = 4;
    const alpha = new Uint8Array(width * height).fill(1);
    const { zones } = computeZones(alpha, width, height, 9);
    expect(zones.length).toBeGreaterThan(1);
    for (const zone of zones) {
      expect(zone.themeId).toBe("grassland");
    }
  });

  test("every assigned theme is a known theme id", () => {
    const { alpha, width, height } = bitmap(["####", "####"]);
    const { zones } = computeZones(alpha, width, height, 3);
    for (const zone of zones) {
      expect(THEME_IDS).toContain(zone.themeId);
    }
  });

  test("overrides win; unknown override ids fall back to the default", () => {
    const { alpha, width, height } = bitmap(["##..##", "##..##"]);
    const { zones } = computeZones(alpha, width, height, 1, {
      0: "urban",
      1: "not-a-theme",
    });
    expect(zones[0].themeId).toBe("urban");
    expect(zones[1].themeId).toBe("grassland");
  });

  test("the slice boundary moves with the seed (wobble is live)", () => {
    const width = MAX_ZONE_WIDTH * 2;
    const height = 4;
    const alpha = new Uint8Array(width * height).fill(1);
    const boundary = (seed: number) => {
      const { zoneMap } = computeZones(alpha, width, height, seed);
      let x = 0;
      while (x < width && zoneMap[x] === zoneMap[0]) x++;
      return x;
    };
    expect(boundary(1)).not.toBe(boundary(2));
  });
});
