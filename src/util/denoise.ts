const SIMILARITY_THRESHOLD = 40;
const AVG_RADIUS = 2; // 5x5 kernel

export function selectiveAverage(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  const thresholdSq = SIMILARITY_THRESHOLD * SIMILARITY_THRESHOLD;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ci = (y * width + x) * 4;
      const cr = data[ci];
      const cg = data[ci + 1];
      const cb = data[ci + 2];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let dy = -AVG_RADIUS; dy <= AVG_RADIUS; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -AVG_RADIUS; dx <= AVG_RADIUS; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const ni = (ny * width + nx) * 4;
          const dr = data[ni] - cr;
          const dg = data[ni + 1] - cg;
          const db = data[ni + 2] - cb;
          const distSq = dr * dr + dg * dg + db * db;

          if (distSq <= thresholdSq) {
            sumR += data[ni];
            sumG += data[ni + 1];
            sumB += data[ni + 2];
            count++;
          }
        }
      }

      out[ci] = Math.round(sumR / count);
      out[ci + 1] = Math.round(sumG / count);
      out[ci + 2] = Math.round(sumB / count);
      // Alpha unchanged — already copied by new Uint8ClampedArray(data)
    }
  }

  return out;
}

const POSTERIZE_STEP = 16;
const DITHER_STRENGTH = 0.2;

export function posterize(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Work on float buffer so error diffusion can go negative
  const buf = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) buf[i] = data[i];

  const out = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    // Serpentine: alternate scan direction per row to break regular patterns
    const leftToRight = y % 2 === 0;

    for (let xi = 0; xi < width; xi++) {
      const x = leftToRight ? xi : width - 1 - xi;
      const dir = leftToRight ? 1 : -1;
      const i = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const old = buf[i + c];
        const quantized = Math.round(old / POSTERIZE_STEP) * POSTERIZE_STEP;
        out[i + c] = Math.min(255, Math.max(0, quantized));
        const error = (old - quantized) * DITHER_STRENGTH;

        // Floyd-Steinberg error diffusion (mirrored on right-to-left rows)
        const next = x + dir;
        const prev = x - dir;
        if (next >= 0 && next < width) buf[i + dir * 4 + c] += error * (7 / 16);
        if (y + 1 < height) {
          if (prev >= 0 && prev < width)
            buf[i + (width - dir) * 4 + c] += error * (3 / 16);
          buf[i + width * 4 + c] += error * (5 / 16);
          if (next >= 0 && next < width)
            buf[i + (width + dir) * 4 + c] += error * (1 / 16);
        }
      }
      // Alpha unchanged
    }
  }

  return out;
}
