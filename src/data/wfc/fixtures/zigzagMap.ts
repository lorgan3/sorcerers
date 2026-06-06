import { Map as GameMap, type Config } from "../../map";
import { socketMultiplier, TILES, TILE_SIZE_PX, type WfcTile } from "../tiles";
import { gridToBlob } from "../postProcess";

const COLS = 12;
const ROWS = 8;

// Mirror axis for the map and the spawn/target nodes (mask-space pixels).
export const MAP_WIDTH = COLS * TILE_SIZE_PX;
const MAP_HEIGHT = ROWS * TILE_SIZE_PX;

function findTile(id: string): WfcTile {
  const t = TILES.find((t) => t.id === id);
  if (!t) {
    throw new Error(`zigzagMap: tile id '${id}' not found in TILES`);
  }
  return t;
}

// Hand-authored deterministic grid: four floor legs (rows 1/3/5/7) joined by
// alternating ladder runs, with ramps, floorBox hops and floorHole gaps so the
// path exercises walk/jump/climb/fall edges. Only a valid findPath matters here
// — the follower itself need not complete. See docs/bot-pathfinding-test.md.
const GRID_IDS: string[][] = [
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"],
  ["floor", "floor", "floorBox", "floor", "doubleFloor", "doubleJumpFloor", "doubleFloorStep", "ramp_m", "floor", "floorHole", "floorLadderTop", "empty"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "rampEntry_m", "halfLadder_m", "empty"],
  ["empty", "empty", "empty", "doubleFloor", "floor", "ramp", "doubleJumpFloor", "halfSolid", "highFloorLadderTop", "highFloorRamp_m", "highFloorStep_m", "floorBox"],
  ["floor", "rampEntry_m", "ramp", "empty", "empty", "empty", "empty", "empty", "halfLadder", "highFloorRamp", "ramp", "solid"],
  ["solid", "steepWall_m", "floor", "floorBox", "floor", "doubleFloor", "doubleFloorSolid", "ramp_m", "floor", "floorHole", "floor", "floorLadderTop"],
  ["empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "tubeLadder"],
  ["floor", "floor", "ramp", "doubleFloor", "doubleFloorStep", "floor", "floorHole", "floor", "ramp", "doubleJumpFloor", "doubleFloorSolid_m", "floorLadder"],
];

export function buildZigzagGrid(): WfcTile[][] {
  const grid = GRID_IDS.map((row) => row.map(findTile));

  if (grid.length !== ROWS) throw new Error("row count mismatch");
  for (const row of grid) {
    if (row.length !== COLS) throw new Error("col count mismatch");
  }

  validateEdges(grid);
  return grid;
}

// Assert every shared edge connects: a zero multiplier means incompatible
// sockets (in practice, a LADDER socket facing a non-LADDER neighbour).
function validateEdges(grid: WfcTile[][]): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];

      const right = grid[y][x + 1];
      if (right && socketMultiplier(tile.sockets.right, right.sockets.left, 1) === 0) {
        throw new Error(
          `zigzagMap: incompatible edge at (${x},${y}) ${tile.id} → ${right.id}`,
        );
      }

      const below = grid[y + 1]?.[x];
      if (below && socketMultiplier(tile.sockets.bottom, below.sockets.top, 1) === 0) {
        throw new Error(
          `zigzagMap: incompatible edge at (${x},${y}) ${tile.id} ↓ ${below.id}`,
        );
      }
    }
  }
}

async function buildZigzagConfig(mirror = false): Promise<Config> {
  const grid = buildZigzagGrid();
  const tilesWithImages = await loadTileImages(grid);
  const { blob: rawBlob, ladders } = await gridToBlob(tilesWithImages);
  // Mirror left↔right by flipping the finished mask horizontally — an exact
  // pixel mirror of the collision geometry (no tile-mirror bookkeeping needed),
  // and deterministic across engines since it resamples nothing.
  const blob = mirror
    ? await flipBlobHorizontally(rawBlob, MAP_WIDTH, MAP_HEIGHT)
    : rawBlob;
  const data = await blobToDataUrl(blob);

  return {
    terrain: { data },
    layers: [],
    bbox: { left: 0, top: 0, right: MAP_WIDTH, bottom: MAP_HEIGHT },
    parallax: { name: "", offset: 0 },
    scale: 6,
    ladders: ladders.map((l) => {
      const cx = mirror ? MAP_WIDTH - l.x : l.x;
      return {
        left: cx - l.width / 2,
        top: l.y,
        right: cx + l.width / 2,
        bottom: l.y + l.height,
      };
    }),
  };
}

export async function buildZigzagMap(mirror = false): Promise<GameMap> {
  return GameMap.fromConfig(await buildZigzagConfig(mirror));
}

async function flipBlobHorizontally(
  blob: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(bitmap, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Near-duplicate of wfc.worker.ts::loadTileImages — kept separate so this
// fixture can run on the main thread and preserve the grid shape.
async function loadTileImages(grid: WfcTile[][]): Promise<WfcTile[][]> {
  const cache = new Map<string, ImageBitmap>();
  const result: WfcTile[][] = [];
  for (const row of grid) {
    const newRow: WfcTile[] = [];
    for (const t of row) {
      if (!t.imagePath) {
        newRow.push(t);
        continue;
      }
      let img = cache.get(t.imagePath);
      if (!img) {
        const res = await fetch(t.imagePath);
        const b = await res.blob();
        img = await createImageBitmap(b);
        cache.set(t.imagePath, img);
      }
      newRow.push({ ...t, imageData: img });
    }
    result.push(newRow);
  }
  return result;
}
