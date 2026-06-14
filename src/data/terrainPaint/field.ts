const INF = 1e9;

export interface DepthField {
  /** Distance in px from each solid pixel to the nearest empty pixel; 0 for empty. */
  depth: Float32Array;
  /** Distance in px from each solid pixel up to the first empty pixel in its column. */
  sky: Float32Array;
}

/**
 * Chamfer 3-4 distance transform (two passes) plus a per-column sky scan.
 * Out-of-bounds counts as solid, so terrain touching the map border keeps
 * full depth instead of reading the border as open air.
 */
export function computeField(
  alpha: Uint8Array,
  width: number,
  height: number
): DepthField {
  const n = width * height;
  const depth = new Float32Array(n);
  for (let i = 0; i < n; i++) depth[i] = alpha[i] ? INF : 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (depth[i] === 0) continue;
      let best = depth[i];
      if (x > 0) best = Math.min(best, depth[i - 1] + 3);
      if (y > 0) {
        best = Math.min(best, depth[i - width] + 3);
        if (x > 0) best = Math.min(best, depth[i - width - 1] + 4);
        if (x < width - 1) best = Math.min(best, depth[i - width + 1] + 4);
      }
      depth[i] = best;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (depth[i] === 0) continue;
      let best = depth[i];
      if (x < width - 1) best = Math.min(best, depth[i + 1] + 3);
      if (y < height - 1) {
        best = Math.min(best, depth[i + width] + 3);
        if (x < width - 1) best = Math.min(best, depth[i + width + 1] + 4);
        if (x > 0) best = Math.min(best, depth[i + width - 1] + 4);
      }
      depth[i] = best;
    }
  }
  // chamfer 3-4 weights approximate euclidean distance × 3
  for (let i = 0; i < n; i++) {
    if (depth[i] !== 0) depth[i] = depth[i] / 3;
  }

  const sky = new Float32Array(n);
  for (let x = 0; x < width; x++) {
    let run = INF; // the top border counts as solid
    for (let y = 0; y < height; y++) {
      const i = y * width + x;
      if (!alpha[i]) {
        sky[i] = 0;
        run = 0;
      } else {
        run = run >= INF ? INF : run + 1;
        sky[i] = run;
      }
    }
  }

  return { depth, sky };
}
