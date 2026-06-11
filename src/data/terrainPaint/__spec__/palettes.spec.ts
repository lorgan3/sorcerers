import { describe, expect, test } from "vitest";
import { THEMES, THEME_IDS } from "../palettes";

const HEX = /^#[0-9a-f]{6}$/;

describe("THEMES", () => {
  test("contains the four initial themes", () => {
    expect([...THEME_IDS].sort()).toEqual(["cave", "grassland", "snow", "urban"]);
  });

  test("every theme is structurally valid", () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      expect(theme.id).toBe(id);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.surface.thickness).toBeGreaterThan(0);
      expect(theme.shallow.depth).toBeGreaterThan(theme.surface.thickness);
      for (const band of [
        theme.surface,
        theme.shallow,
        theme.deep,
        theme.rubble,
      ]) {
        // patterned bands reserve the last color as accent, so need >= 2
        expect(band.ramp.length).toBeGreaterThanOrEqual(band.pattern ? 2 : 1);
        for (const color of band.ramp) {
          expect(color).toMatch(HEX);
        }
      }
      expect(theme.ladder.rail).toMatch(HEX);
      expect(theme.ladder.rung).toMatch(HEX);
      expect(theme.outline).toMatch(HEX);
    }
  });

  test("urban brick pattern returns the mortar (last) index on mortar rows", () => {
    const brick = THEMES.urban.shallow;
    const len = brick.ramp.length;
    // y % 8 === 7 is always a horizontal mortar line
    expect(brick.pattern!(3, 7, 0, len)).toBe(len - 1);
    expect(brick.pattern!(20, 15, 1, len)).toBe(len - 1);
    // inside a brick body the index never lands on the mortar color
    expect(brick.pattern!(2, 2, 0, len)).toBeLessThan(len - 1);
  });

  test("patterns are pure functions of position", () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      for (const band of [theme.shallow, theme.deep, theme.rubble]) {
        if (!band.pattern) continue;
        const len = band.ramp.length;
        const first = band.pattern(13, 9, 1, len);
        band.pattern(99, 99, 0, len);
        expect(band.pattern(13, 9, 1, len)).toBe(first);
      }
    }
  });
});
