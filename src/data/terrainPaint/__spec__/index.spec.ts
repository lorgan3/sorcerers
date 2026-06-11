import { describe, expect, test } from "vitest";
import { paintTerrain } from "../index";
import { THEME_IDS } from "../palettes";
import { bitmap } from "./helpers";

const MAP = [
  "....................",
  "......####..........",
  ".....######....##...",
  "....########..####..",
  "####################",
  "####################",
];

function paint(seed = 1, themeOverrides?: Record<number, string>) {
  const { alpha, width, height } = bitmap(MAP);
  return {
    result: paintTerrain({
      alpha,
      width,
      height,
      ladders: [],
      seed,
      themeOverrides,
    }),
    alpha,
    width,
    height,
  };
}

describe("paintTerrain", () => {
  test("terrain alpha equals input alpha exactly", () => {
    const { result, alpha } = paint();
    const data = result.terrain.data;
    for (let i = 0; i < alpha.length; i++) {
      expect(data[i * 4 + 3]).toBe(alpha[i] ? 255 : 0);
    }
  });

  test("terrain and background alphas are binary", () => {
    const { result } = paint();
    for (const img of [result.terrain, result.background]) {
      for (let i = 3; i < img.data.length; i += 4) {
        expect(img.data[i] === 0 || img.data[i] === 255).toBe(true);
      }
    }
  });

  test("same input and seed produce byte-identical output", () => {
    const a = paint(7).result;
    const b = paint(7).result;
    expect(Array.from(a.terrain.data)).toEqual(Array.from(b.terrain.data));
    expect(Array.from(a.background.data)).toEqual(
      Array.from(b.background.data)
    );
    expect(a.zones).toEqual(b.zones);
  });

  test("returns zone info with valid themes and honors overrides", () => {
    const auto = paint(1).result;
    expect(auto.zones.length).toBeGreaterThan(0);
    for (const zone of auto.zones) {
      expect(THEME_IDS).toContain(zone.themeId);
    }
    const overridden = paint(1, { 0: "snow" }).result;
    expect(overridden.zones[0].themeId).toBe("snow");
  });

  test("exposes the zone map for UI hit-testing", () => {
    const { result, alpha, width, height } = paint();
    expect(result.zoneMap.length).toBe(width * height);
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i]) {
        expect(result.zoneMap[i]).toBeGreaterThanOrEqual(0);
      } else {
        expect(result.zoneMap[i]).toBe(-1);
      }
    }
  });

  test("solid pixels get a non-black color from the theme", () => {
    const { result, alpha, width } = paint();
    // a deep pixel in the floor: row 5, column 10
    const i = 5 * width + 10;
    expect(alpha[i]).toBe(1);
    const o = i * 4;
    const [r, g, b] = [
      result.terrain.data[o],
      result.terrain.data[o + 1],
      result.terrain.data[o + 2],
    ];
    expect(r + g + b).toBeGreaterThan(0);
  });

  test("handles an empty map without crashing", () => {
    const { alpha, width, height } = bitmap(["....", "...."]);
    const result = paintTerrain({
      alpha,
      width,
      height,
      ladders: [],
      seed: 1,
    });
    expect(result.zones).toHaveLength(0);
    for (let i = 3; i < result.terrain.data.length; i += 4) {
      expect(result.terrain.data[i]).toBe(0);
    }
  });
});
