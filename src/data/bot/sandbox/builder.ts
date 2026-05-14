import { TILES, type WfcTile } from "../../wfc/tiles";

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
