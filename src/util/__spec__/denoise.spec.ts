import { selectiveAverage } from "../denoise";

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

