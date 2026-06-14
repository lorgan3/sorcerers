import { describe, expect, test } from "vitest";
import { buildBackwall } from "../backwall";
import { computeZones } from "../zones";
import { THEMES } from "../palettes";
import { createImageData, hexToRgb } from "../pixel";
import { bitmap } from "./helpers";

// Blocks are wide (>= 2*EDGE_WOBBLE+1) so the ragged-edge wobble never reaches
// the interior columns the tests assert on.
// left block cols0-9 (ceiling row1, floor row4). col10: open sky.
// right block cols11-19 (ceiling row1, no floor -> floorless to the bottom).
const W = 20;
const ROOF = [
  "....................",
  "##########.#########",
  "....................",
  "....................",
  "##########..........",
  "....................",
];

function backwallFor(
  rows: string[],
  themeByCeil: Record<number, string> = {},
  seed = 1
) {
  const { alpha, width, height } = bitmap(rows);
  const { zoneMap, zones } = computeZones(alpha, width, height, seed);
  // themeByCeil maps a "solid pixel index" to a themeId for that pixel's zone
  for (const key of Object.keys(themeByCeil)) {
    const zi = zoneMap[Number(key)];
    if (zi >= 0) zones[zi].themeId = themeByCeil[Number(key)];
  }
  const background = createImageData(width, height);
  buildBackwall({ background, width, height, zoneMap, zones, seed });
  return { background, alpha, zoneMap, zones, width, height };
}

const alphaAt = (data: Uint8ClampedArray, i: number) => data[i * 4 + 3];

// Shading multiplies every channel of a ramp color by one factor f in (0, 1].
// A painted pixel belongs to a theme if it is such a uniform scaling of any of
// that theme's ramp colors.
const isScaledRampColor = (
  data: Uint8ClampedArray,
  i: number,
  themeId: string
): boolean => {
  const px = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  return THEMES[themeId].backwall!.ramp.some((hex) => {
    const c = hexToRgb(hex);
    const factors: number[] = [];
    for (let k = 0; k < 3; k++) {
      if (c[k] === 0) {
        if (px[k] > 2) return false;
        continue;
      }
      const f = px[k] / c[k];
      if (f < 0.3 || f > 1.05) return false;
      factors.push(f);
    }
    return Math.max(...factors) - Math.min(...factors) < 0.06;
  });
};

describe("buildBackwall", () => {
  test("open-sky pixels (no solid above) stay transparent", () => {
    const { background, width } = backwallFor(ROOF);
    // col 10, row 2: the gap column has nothing solid above it
    expect(alphaAt(background.data, 2 * width + 10)).toBe(0);
  });

  test("a roofed empty pixel is filled opaque", () => {
    const { background, width } = backwallFor(ROOF);
    // col 4, row 2: solid ceiling at row 1 above it
    expect(alphaAt(background.data, 2 * width + 4)).toBe(255);
  });

  test("a roofed pixel takes the ceiling theme, not the floor's", () => {
    const { background, width } = backwallFor(ROOF, {
      [1 * W + 4]: "cave", // left ceiling (row1 col4)
      [4 * W + 4]: "grassland", // left floor (row4 col4)
    });
    // row2 col4: under the cave ceiling
    expect(isScaledRampColor(background.data, 2 * width + 4, "cave")).toBe(true);
    // row5 col4: under the grassland floor acting as the nearest ceiling
    expect(
      isScaledRampColor(background.data, 5 * width + 4, "grassland")
    ).toBe(true);
  });

  test("a floorless roofed column fills down to the bottom row", () => {
    const { background, width, height } = backwallFor(ROOF);
    // col 15: ceiling at row1, no floor below -> bottom row filled
    expect(alphaAt(background.data, (height - 1) * width + 15)).toBe(255);
  });

  test("a theme without a back-wall (toon) leaves its pockets transparent", () => {
    const { background, width } = backwallFor(ROOF, {
      [1 * W + 15]: "toon", // right ceiling (row1 col15)
    });
    expect(alphaAt(background.data, 2 * width + 15)).toBe(0);
  });

  test("fills behind solid terrain so erosion reveals the wall", () => {
    const { background, width } = backwallFor(ROOF);
    // row1 col4 is solid ceiling: its backing must be painted, not transparent
    expect(alphaAt(background.data, 1 * width + 4)).toBe(255);
  });

  test("never paints open sky above the first solid pixel", () => {
    const { background, alpha, width, height } = backwallFor(ROOF);
    const data = background.data;
    for (let x = 0; x < width; x++) {
      let seenSolid = false;
      for (let y = 0; y < height; y++) {
        const i = y * width + x;
        if (alpha[i]) seenSolid = true;
        // a painted pixel must have solid terrain at or above it in its column
        if (alphaAt(data, i) !== 0) expect(seenSolid).toBe(true);
      }
    }
  });

  test("is deterministic for the same seed", () => {
    const a = backwallFor(ROOF, {}, 5);
    const b = backwallFor(ROOF, {}, 5);
    expect(Array.from(a.background.data)).toEqual(
      Array.from(b.background.data)
    );
  });
});
