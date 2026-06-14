import { describe, expect, test } from "vitest";
import { paintTerrain } from "../index";
import { THEMES, THEME_IDS } from "../palettes";
import { hexToRgb } from "../pixel";
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

  test("paints a themed back-wall into roofed pockets", () => {
    // a wide roof over open empty space, no floor: pockets must fill
    const roof = [
      "....................",
      "####################",
      "....................",
      "....................",
      "....................",
      "....................",
    ];
    const { alpha, width, height } = bitmap(roof);
    const result = paintTerrain({
      alpha,
      width,
      height,
      ladders: [],
      seed: 1,
    });
    const data = result.background.data;
    let filled = 0;
    for (let x = 0; x < width; x++) {
      // row 3 sits under the solid roof at row 1
      if (data[(3 * width + x) * 4 + 3] === 255) filled++;
    }
    expect(filled).toBe(width);
  });

  test("a zone theme override drives its roofed pocket's back-wall", () => {
    // one landmass -> zone 0; overriding it must reach the back-wall colors
    const roof = [
      "....................",
      "####################",
      "....................",
      "....................",
      "....................",
      "....................",
    ];
    const { alpha, width, height } = bitmap(roof);
    const result = paintTerrain({
      alpha,
      width,
      height,
      ladders: [],
      seed: 1,
      themeOverrides: { 0: "urban" },
    });
    expect(result.zones[0].themeId).toBe("urban");
    // shading scales every channel of a ramp color by one factor; the painted
    // pixel must be a uniform scaling of some urban back-wall color.
    const data = result.background.data;
    const o = (3 * width + 5) * 4;
    const px = [data[o], data[o + 1], data[o + 2]];
    const matches = THEMES.urban.backwall!.ramp.some((hex) => {
      const c = hexToRgb(hex);
      const factors: number[] = [];
      for (let k = 0; k < 3; k++) {
        if (c[k] === 0) return px[k] <= 2;
        const f = px[k] / c[k];
        if (f < 0.3 || f > 1.05) return false;
        factors.push(f);
      }
      return Math.max(...factors) - Math.min(...factors) < 0.06;
    });
    expect(matches).toBe(true);
  });

  test("a ladder casts a contact shadow onto the terrain at its base", () => {
    const width = 40;
    const height = 40;
    const rows = Array.from({ length: height }, () => "#".repeat(width));
    const { alpha } = bitmap(rows);
    const ladder = { left: 16, top: 4, right: 28, bottom: 30 };
    const shade = (ladders: typeof ladder[]) =>
      paintTerrain({ alpha, width, height, ladders, seed: 1 }).terrain.data;
    const withLadder = shade([ladder]);
    const without = shade([]);
    // a solid-terrain pixel near the ladder's base center (22, 30)
    const i = 30 * width + 30;
    const sum = (d: Uint8ClampedArray) => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2];
    // still opaque terrain, just darkened by the contact shadow
    expect(withLadder[i * 4 + 3]).toBe(255);
    expect(sum(withLadder)).toBeLessThan(sum(without));
  });
});
