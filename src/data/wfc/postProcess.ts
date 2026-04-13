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

/** Apply Gaussian blur and re-threshold to produce clean mask */
export function postProcess(canvas: OffscreenCanvas): OffscreenCanvas {
  const { width, height } = canvas;
  const smoothed = new OffscreenCanvas(width, height);
  const ctx = smoothed.getContext("2d")!;

  ctx.filter = "blur(2px)";
  ctx.drawImage(canvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    const solid = alpha > 128;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = solid ? 255 : 0;
  }

  ctx.filter = "none";
  ctx.putImageData(imageData, 0, 0);
  return smoothed;
}

/** Convert solved grid to mask PNG blob + ladder metadata */
export async function gridToBlob(
  grid: WfcTile[][],
): Promise<{ blob: Blob; ladders: LadderInfo[] }> {
  const raw = renderGrid(grid);
  const output = postProcess(raw);
  const blob = await output.convertToBlob({ type: "image/webp" });
  const ladders = detectLadders(grid);
  return { blob, ladders };
}
