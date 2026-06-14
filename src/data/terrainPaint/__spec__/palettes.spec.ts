import { describe, expect, test } from "vitest";
import { THEMES, THEME_IDS } from "../palettes";

const HEX = /^#[0-9a-f]{6}$/;

describe("THEMES", () => {
  test("contains the six themes", () => {
    expect([...THEME_IDS].sort()).toEqual([
      "cave",
      "grassland",
      "planks",
      "snow",
      "toon",
      "urban",
    ]);
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
      if (theme.outline !== undefined) {
        expect(theme.outline).toMatch(HEX);
      }
    }
  });

  test("only toon uses pillow-shading outlines", () => {
    const outlined = THEME_IDS.filter((id) => THEMES[id].outline);
    expect(outlined).toEqual(["toon"]);
  });

  test("urban brick pattern returns the mortar (last) index on mortar rows", () => {
    const brick = THEMES.urban.shallow;
    const len = brick.ramp.length;
    // y % 4 === 3 is always a horizontal mortar line
    expect(brick.pattern!(3, 3, 0, len)).toBe(len - 1);
    expect(brick.pattern!(20, 7, 1, len)).toBe(len - 1);
    // inside a brick body the index never lands on the mortar color
    expect(brick.pattern!(2, 1, 0, len)).toBeLessThan(len - 1);
  });

  test("cave rock pattern produces fracture seams and bounded facets", () => {
    const rock = THEMES.cave.shallow;
    const len = rock.ramp.length;
    let seams = 0;
    let bodies = 0;
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 60; x++) {
        const idx = rock.pattern!(x, y, 0, len);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(len);
        if (idx === len - 1) seams++;
        else bodies++;
      }
    }
    // fracture seams exist but the body dominates
    expect(seams).toBeGreaterThan(0);
    expect(bodies).toBeGreaterThan(seams * 5);
  });

  test("plank pattern returns the seam (last) index on board seams", () => {
    const planks = THEMES.planks.shallow;
    const len = planks.ramp.length;
    // y % 6 === 5 is always a horizontal board seam
    expect(planks.pattern!(7, 5, 0, len)).toBe(len - 1);
    expect(planks.pattern!(40, 11, 1, len)).toBe(len - 1);
    // inside a board the index never lands on the seam color
    expect(planks.pattern!(2, 2, 0, len)).toBeLessThan(len - 1);
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

  test("every theme except toon defines a valid back-wall band", () => {
    for (const id of THEME_IDS) {
      const band = THEMES[id].backwall;
      if (id === "toon") {
        expect(band).toBeUndefined();
        continue;
      }
      expect(band).toBeDefined();
      expect(band!.ramp.length).toBeGreaterThanOrEqual(band!.pattern ? 2 : 1);
      for (const color of band!.ramp) {
        expect(color).toMatch(HEX);
      }
    }
  });

  test("back-wall patterns are pure functions of position", () => {
    for (const id of THEME_IDS) {
      const band = THEMES[id].backwall;
      if (!band?.pattern) continue;
      const len = band.ramp.length;
      const first = band.pattern(13, 9, 0, len);
      band.pattern(99, 99, 0, len);
      expect(band.pattern(13, 9, 0, len)).toBe(first);
    }
  });

  test("back-wall patterns stay within ramp bounds", () => {
    for (const id of THEME_IDS) {
      const band = THEMES[id].backwall;
      if (!band?.pattern) continue;
      const len = band.ramp.length;
      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < 60; x++) {
          const idx = band.pattern(x, y, 0, len);
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(len);
        }
      }
    }
  });
});
