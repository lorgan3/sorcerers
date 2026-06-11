export type Rng = () => number;

/** Deterministic PRNG; same seed yields the same sequence on every engine. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Position-stable hash noise in [0, 1); independent of evaluation order. */
export function noise2d(seed: number, x: number, y: number): number {
  let h =
    ((seed | 0) ^ 0x9e3779b9) ^
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
