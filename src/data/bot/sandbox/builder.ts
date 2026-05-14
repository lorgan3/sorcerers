import { gridToBlob, type LadderInfo } from "../../wfc/postProcess";
import { TILES, TILE_SIZE_PX, type WfcTile } from "../../wfc/tiles";

const BY_ID = new Map<string, WfcTile>(TILES.map((t) => [t.id, t]));

export function resolveTiles(ids: string[][]): WfcTile[][] {
  return ids.map((row, y) =>
    row.map((id, x) => {
      const tile = BY_ID.get(id);
      if (!tile) {
        throw new Error(
          `Unknown sandbox tile id "${id}" at (${x},${y}). ` +
            `Check src/data/wfc/tiles.ts for valid ids (mirrored variants end in "_m").`,
        );
      }
      return tile;
    }),
  );
}

const imageCache = new Map<string, ImageBitmap>();

async function ensureImageData(tile: WfcTile): Promise<void> {
  if (tile.imageData) return;
  let bitmap = imageCache.get(tile.imagePath);
  if (!bitmap) {
    const response = await fetch(tile.imagePath);
    bitmap = await createImageBitmap(await response.blob());
    imageCache.set(tile.imagePath, bitmap);
  }
  tile.imageData = bitmap;
}

export interface BuiltMask {
  blob: Blob;
  ladders: LadderInfo[];
  width: number;
  height: number;
}

export async function buildScenarioMask(
  tiles: WfcTile[][],
): Promise<BuiltMask> {
  for (const row of tiles) {
    for (const tile of row) {
      await ensureImageData(tile);
    }
  }
  const { blob, ladders } = await gridToBlob(tiles);
  const width = tiles[0].length * TILE_SIZE_PX;
  const height = tiles.length * TILE_SIZE_PX;
  return { blob, ladders, width, height };
}
