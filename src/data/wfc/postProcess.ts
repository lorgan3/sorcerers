import type { SeedTile } from "./wfc";
import { TILE_SIZE_PX, type WfcTile } from "./tiles";

function hashColor(id: string): [number, number, number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return [
    (Math.abs(r) % 200) + 55,
    (Math.abs(g) % 200) + 55,
    (Math.abs(b) % 200) + 55,
  ];
}

const DEBUG = false;

const BUFFER = 2 * TILE_SIZE_PX;

export function renderGrid(grid: WfcTile[][]): OffscreenCanvas {
  const rows = grid.length;
  const cols = grid[0].length;
  const width = cols * TILE_SIZE_PX;
  const tileHeight = rows * TILE_SIZE_PX;
  const height = tileHeight + 2 * BUFFER;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  function setPixel(
    x: number,
    y: number,
    solid: boolean,
    cr: number,
    cg: number,
    cb: number,
  ) {
    const idx = (y * width + x) * 4;
    if (DEBUG) {
      data[idx] = solid ? cr : 255;
      data[idx + 1] = solid ? cg : 255;
      data[idx + 2] = solid ? cb : 255;
    } else {
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
    }
    data[idx + 3] = solid ? 255 : 0;
  }

  // Render tiles with BUFFER offset (no edge extension — done after blur)
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tile = grid[ty][tx];
      const offsetX = tx * TILE_SIZE_PX;
      const offsetY = ty * TILE_SIZE_PX + BUFFER;
      const [cr, cg, cb] = DEBUG ? hashColor(tile.id) : [0, 0, 0];

      for (let py = 0; py < TILE_SIZE_PX; py++) {
        for (let px = 0; px < TILE_SIZE_PX; px++) {
          setPixel(offsetX + px, offsetY + py, tile.pixels[py][px], cr, cg, cb);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

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

  // Extend top edge: repeat the first tile row upward into the buffer,
  // but only if more than 1 pixel in that row is solid
  const tileHeight = height - 2 * BUFFER;
  for (let px = 0; px < width; px++) {
    // Count solid pixels in the first tile row for this column's tile
    const tileX = Math.floor(px / TILE_SIZE_PX);
    const tileStartX = tileX * TILE_SIZE_PX;
    let solidCount = 0;
    for (let tx = tileStartX; tx < tileStartX + TILE_SIZE_PX && tx < width; tx++) {
      if (data[(BUFFER * width + tx) * 4 + 3] > 128) solidCount++;
    }
    if (solidCount <= 1) continue;

    const solid = data[(BUFFER * width + px) * 4 + 3] > 128;
    for (let by = 0; by < BUFFER; by++) {
      const idx = (by * width + px) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = solid ? 255 : 0;
    }
  }

  // Extend bottom edge: repeat the last tile row downward into the buffer
  const lastTileRow = BUFFER + tileHeight - 1;
  for (let px = 0; px < width; px++) {
    const solid = data[(lastTileRow * width + px) * 4 + 3] > 128;
    for (let by = 0; by < BUFFER; by++) {
      const idx = ((lastTileRow + 1 + by) * width + px) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = solid ? 255 : 0;
    }
  }

  ctx.filter = "none";
  ctx.putImageData(imageData, 0, 0);
  return smoothed;
}

// Minimum floating island size in tiles² — smaller ones get removed
const MIN_ISLAND_TILES = 3;

/** Remove ungrounded solid regions that are small. Regions connected to the
 *  bottom edge or seed positions are always kept. */
function removeFloatingIslands(
  canvas: OffscreenCanvas,
  seedPixels?: Set<number>,
): OffscreenCanvas {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const minSize = TILE_SIZE_PX * TILE_SIZE_PX * MIN_ISLAND_TILES;

  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) {
    solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const bottomRow = (height - 1) * width;

  for (let start = 0; start < solid.length; start++) {
    if (visited[start] || !solid[start]) continue;

    const region: number[] = [];
    let grounded = false;
    queue.push(start);
    visited[start] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      region.push(idx);

      // Grounded if touching bottom edge or a seed pixel
      if (idx >= bottomRow) grounded = true;
      if (seedPixels?.has(idx)) grounded = true;

      const x = idx % width;
      const y = (idx - x) / width;
      const neighbors = [
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
      ];

      for (const n of neighbors) {
        if (n >= 0 && solid[n] && !visited[n]) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    // Keep grounded regions; remove small floating ones (50% chance to keep)
    if (!grounded && region.length < minSize && Math.random() < 0.75) {
      for (const idx of region) {
        const di = idx * 4;
        data[di] = 0;
        data[di + 1] = 0;
        data[di + 2] = 0;
        data[di + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Base hole size in tiles² — scaled by density
const BASE_HOLE_TILES = 4;

function fillSmallHoles(
  canvas: OffscreenCanvas,
  density: number,
): OffscreenCanvas {
  // Higher density = fill larger holes to create more solid terrain
  const maxHoleSize =
    TILE_SIZE_PX * TILE_SIZE_PX * BASE_HOLE_TILES * (1 + density * 3);
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) {
    solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let start = 0; start < solid.length; start++) {
    if (visited[start] || solid[start]) continue;

    const region: number[] = [];
    let touchesBorder = false;
    queue.push(start);
    visited[start] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      region.push(idx);

      const x = idx % width;
      const y = (idx - x) / width;

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        touchesBorder = true;
      }

      const neighbors = [
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
      ];

      for (const n of neighbors) {
        if (n >= 0 && !visited[n] && !solid[n]) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    if (!touchesBorder && region.length < maxHoleSize) {
      for (const idx of region) {
        const di = idx * 4;
        data[di] = 0;
        data[di + 1] = 0;
        data[di + 2] = 0;
        data[di + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function gridToBlob(
  grid: WfcTile[][],
  density: number,
  seeds?: SeedTile[],
): Promise<Blob> {
  const raw = renderGrid(grid);
  const cols = grid[0].length;

  // Convert seed tile positions to pixel indices for the rendered canvas
  let seedPixels: Set<number> | undefined;
  if (seeds && seeds.length > 0) {
    const canvasWidth = cols * TILE_SIZE_PX;
    seedPixels = new Set<number>();
    for (const { x, y } of seeds) {
      const px0 = x * TILE_SIZE_PX;
      const py0 = y * TILE_SIZE_PX + BUFFER;
      for (let py = py0; py < py0 + TILE_SIZE_PX; py++) {
        for (let px = px0; px < px0 + TILE_SIZE_PX; px++) {
          seedPixels.add(py * canvasWidth + px);
        }
      }
    }
  }

  const cleaned = fillSmallHoles(
    removeFloatingIslands(raw, seedPixels),
    density,
  );
  const output = DEBUG ? cleaned : postProcess(cleaned);
  return await output.convertToBlob({ type: "image/png" });
}

export async function seedsToBlob(
  width: number,
  height: number,
  seeds: SeedTile[],
  tiles: WfcTile[],
): Promise<Blob> {
  // Build a sparse grid with only the seeded tiles, rest as empty
  const emptyTile = tiles.find((t) => t.id === "empty")!;
  const grid: WfcTile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => emptyTile),
  );

  for (const { x, y, tileId } of seeds) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const match = tiles.find(
      (t) => t.id === tileId || t.id.startsWith(tileId + "_r"),
    );
    if (match) grid[y][x] = match;
  }

  const raw = renderGrid(grid);
  return await raw.convertToBlob({ type: "image/png" });
}
