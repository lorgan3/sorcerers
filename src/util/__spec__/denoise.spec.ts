import { selectiveAverage, posterize } from "../denoise";

function makePixels(
  width: number,
  height: number,
  fill: [number, number, number, number]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return data;
}

function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number
) {
  const i = (y * width + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
}

function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): [number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

describe("selectiveAverage", () => {
  test("uniform region stays unchanged", () => {
    const data = makePixels(5, 5, [100, 150, 200, 255]);
    const result = selectiveAverage(data, 5, 5);
    expect(getPixel(result, 5, 2, 2)).toEqual([100, 150, 200]);
  });

  test("slightly different pixel gets averaged toward neighbors", () => {
    // 5x5 all (100,100,100) except center is (110,110,110) — within threshold 40
    const data = makePixels(5, 5, [100, 100, 100, 255]);
    setPixel(data, 5, 2, 2, 110, 110, 110);
    const result = selectiveAverage(data, 5, 5);
    const [r, g, b] = getPixel(result, 5, 2, 2);
    // 24 neighbors at 100 + center at 110 = average 100.4, rounds to 100
    expect(r).toBe(100);
  });

  test("edge pixel far from neighbors is preserved", () => {
    // Left half red (200,0,0), right half blue (0,0,200) — distance ~283, well above threshold 40
    const width = 6;
    const height = 1;
    const data = makePixels(width, height, [200, 0, 0, 255]);
    for (let x = 3; x < 6; x++) {
      setPixel(data, width, x, 0, 0, 0, 200);
    }
    const result = selectiveAverage(data, width, height);
    // Boundary pixels should not bleed across the edge
    expect(getPixel(result, width, 2, 0)).toEqual([200, 0, 0]);
    expect(getPixel(result, width, 3, 0)).toEqual([0, 0, 200]);
  });

  test("does not modify alpha channel", () => {
    const data = makePixels(3, 3, [100, 100, 100, 128]);
    const result = selectiveAverage(data, 3, 3);
    // Check alpha of center pixel
    const i = (1 * 3 + 1) * 4;
    expect(result[i + 3]).toBe(128);
  });
});

describe("posterize", () => {
  test("quantizes to nearest step of 16", () => {
    // A single pixel with value 70 should quantize to round(70/16)*16 = 4*16 = 64
    const data = makePixels(1, 1, [70, 130, 9, 255]);
    const result = posterize(data, 1, 1);
    const [r, g, b] = getPixel(result, 1, 0, 0);
    expect(r).toBe(64); // round(70/16)*16 = 64
    expect(g).toBe(128); // round(130/16)*16 = 128
    expect(b).toBe(16); // round(9/16)*16 = 16
  });

  test("preserves alpha channel", () => {
    const data = makePixels(3, 3, [100, 100, 100, 180]);
    const result = posterize(data, 3, 3);
    for (let i = 3; i < result.length; i += 4) {
      expect(result[i]).toBe(180);
    }
  });

  test("clamps output to 0-255", () => {
    // Value 0 quantizes to 0, value 255 quantizes to 256 but clamps to 255
    const data = makePixels(1, 1, [0, 255, 248, 255]);
    const result = posterize(data, 1, 1);
    const [r, g, b] = getPixel(result, 1, 0, 0);
    expect(r).toBe(0);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeLessThanOrEqual(255);
    expect(r).toBeGreaterThanOrEqual(0);
  });

  test("dithering distributes error to neighbors", () => {
    // Row of pixels all at value 8 (exactly halfway between steps 0 and 16).
    // Pixel 0 quantizes to 16, error = (8-16)*0.2 = -1.6, propagated right.
    // Over many pixels the accumulated error should eventually flip a pixel
    // to quantize to 0 instead of 16.
    const width = 50;
    const data = makePixels(width, 1, [8, 8, 8, 255]);
    const result = posterize(data, width, 1);

    const values = new Set<number>();
    for (let x = 0; x < width; x++) {
      values.add(getPixel(result, width, x, 0)[0]);
    }
    // Without dithering all pixels would quantize to the same step;
    // with error diffusion we expect at least two distinct output levels
    expect(values.size).toBeGreaterThanOrEqual(2);
  });

  test("uniform region stays mostly uniform", () => {
    // All pixels identical — quantization should produce the same value everywhere
    // (error is 0 so dithering has no effect)
    const data = makePixels(5, 5, [96, 96, 96, 255]);
    const result = posterize(data, 5, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const [r, g, b] = getPixel(result, 5, x, y);
        expect(r).toBe(96); // round(96/16)*16 = 96
        expect(g).toBe(96);
        expect(b).toBe(96);
      }
    }
  });
});

