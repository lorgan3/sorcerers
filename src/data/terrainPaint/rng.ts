/** Position-stable hash noise in [0, 1); independent of evaluation order. */
export function noise2d(seed: number, x: number, y: number): number {
  let h =
    ((seed | 0) ^ 0x9e3779b9) ^
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
