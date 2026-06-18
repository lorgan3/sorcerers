export function buildDefaultMask(width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const band = Math.round(height * 0.2);
  const solidStart = height - band;
  const halfStart = solidStart - band;
  for (let y = 0; y < height; y++) {
    const value = y >= solidStart ? 255 : y >= halfStart ? 128 : 0;
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = value;
    }
  }
  return mask;
}
