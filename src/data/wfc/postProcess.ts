import { Socket, TILE_SIZE_PX, type WfcTile } from "./tiles";

export interface LadderInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LADDER_WIDTH = 14; // pixels, centered in tile

/** Detect vertical runs of ladder tiles and return metadata */
export function detectLadders(grid: WfcTile[][]): LadderInfo[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const ladders: LadderInfo[] = [];

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (visited[y][x]) continue;
      const tile = grid[y][x];
      if (
        tile.sockets.top !== Socket.LADDER &&
        tile.sockets.bottom !== Socket.LADDER
      ) {
        continue;
      }

      // Found a ladder tile — scan downward for contiguous run
      let runLength = 0;
      let cy = y;
      while (
        cy < rows &&
        (grid[cy][x].sockets.top === Socket.LADDER ||
          grid[cy][x].sockets.bottom === Socket.LADDER)
      ) {
        visited[cy][x] = true;
        runLength++;
        cy++;
      }

      ladders.push({
        x: x * TILE_SIZE_PX + TILE_SIZE_PX / 2,
        y: y * TILE_SIZE_PX,
        width: LADDER_WIDTH,
        height: runLength * TILE_SIZE_PX,
      });
    }
  }

  return ladders;
}

/** Render solved grid to canvas using tile imageData */
export function renderGrid(grid: WfcTile[][]): OffscreenCanvas {
  const rows = grid.length;
  const cols = grid[0].length;
  const width = cols * TILE_SIZE_PX;
  const height = rows * TILE_SIZE_PX;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tile = grid[ty][tx];
      if (!tile.imageData) continue;

      if (tile.mirrored) {
        ctx.save();
        ctx.translate((tx + 1) * TILE_SIZE_PX, ty * TILE_SIZE_PX);
        ctx.scale(-1, 1);
        ctx.drawImage(tile.imageData, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(tile.imageData, tx * TILE_SIZE_PX, ty * TILE_SIZE_PX);
      }
    }
  }

  return canvas;
}

// Blur strength, in pixels of Gaussian σ. The old `ctx.filter = "blur(4px)"`
// was σ ≈ 4; lower = sharper terrain edges. Tune this single knob to taste.
const BLUR_SIGMA = 3.5;
const BLUR_PASSES = 3;
const SOLID_ALPHA_THRESHOLD = 64;

// Per-pass box-blur radii whose combined variance approximates a Gaussian of
// BLUR_SIGMA (Kuckir's 3-box method). Mixed radii let us hit fractional σ that
// a single integer radius can't. Computed once at module load.
function boxRadiiForGauss(sigma: number, passes: number): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / passes + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal =
    (12 * sigma * sigma - passes * wl * wl - 4 * passes * wl - 3 * passes) /
    (-4 * wl - 4);
  const m = Math.round(mIdeal);

  const radii: number[] = [];
  for (let i = 0; i < passes; i++) radii.push(((i < m ? wl : wu) - 1) / 2);
  return radii;
}

const BLUR_RADII = boxRadiiForGauss(BLUR_SIGMA, BLUR_PASSES);

// One separable box-blur pass. At the canvas border the window is clamped and
// the average is renormalised over the in-bounds samples only — so edge terrain
// (notably the floor row sitting on the bottom edge) keeps full weight rather
// than fading toward transparent. Zero-padding the border instead amplified
// tiny per-engine raster differences right at the edge into a divergent mask.
// Uses a sliding window so each pass is O(width * height) regardless of radius.
function boxBlurPass(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
) {
  const outer = horizontal ? height : width;
  const inner = horizontal ? width : height;
  const stride = horizontal ? 1 : width;

  for (let o = 0; o < outer; o++) {
    const base = horizontal ? o * width : o;

    let sum = 0;
    for (let i = 0; i <= radius && i < inner; i++) sum += src[base + i * stride];

    for (let i = 0; i < inner; i++) {
      const lo = i - radius < 0 ? 0 : i - radius;
      const hi = i + radius >= inner ? inner - 1 : i + radius;
      dst[base + i * stride] = sum / (hi - lo + 1);

      const add = i + radius + 1;
      const sub = i - radius;
      if (add < inner) sum += src[base + add * stride];
      if (sub >= 0) sum -= src[base + sub * stride];
    }
  }
}

/**
 * Blur (deterministic, pure JS) and re-threshold to produce a clean mask.
 *
 * The blur is computed in JS rather than via `ctx.filter = "blur()"` because
 * the canvas filter is engine-specific (Skia vs Gecko differ in kernel and
 * edge handling), which made the same fixture produce different collision
 * masks — and thus different bot graphs — across browsers. Identical float
 * math here yields identical masks on every engine.
 */
export function postProcess(canvas: OffscreenCanvas): OffscreenCanvas {
  const { width, height } = canvas;
  const imageData = canvas
    .getContext("2d")!
    .getImageData(0, 0, width, height);
  const data = imageData.data;

  const n = width * height;
  let a = new Float32Array(n);
  let b = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = data[i * 4 + 3];

  for (const radius of BLUR_RADII) {
    boxBlurPass(a, b, width, height, radius, true);
    boxBlurPass(b, a, width, height, radius, false);
  }

  for (let i = 0; i < n; i++) {
    const solid = a[i] > SOLID_ALPHA_THRESHOLD ? 255 : 0;
    const o = i * 4;
    data[o] = 0;
    data[o + 1] = 0;
    data[o + 2] = 0;
    data[o + 3] = solid;
  }

  const smoothed = new OffscreenCanvas(width, height);
  smoothed.getContext("2d")!.putImageData(imageData, 0, 0);
  return smoothed;
}

/** Convert solved grid to mask PNG blob + ladder metadata */
export async function gridToBlob(
  grid: WfcTile[][],
): Promise<{ blob: Blob; ladders: LadderInfo[] }> {
  const raw = renderGrid(grid);
  const output = postProcess(raw);
  const blob = await output.convertToBlob({ type: "image/png" });
  const ladders = detectLadders(grid);
  return { blob, ladders };
}
