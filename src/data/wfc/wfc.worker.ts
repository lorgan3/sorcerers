import { TILES, type WfcTile } from "./tiles";
import { solve } from "./wfc";
import { gridToBlob, type LadderInfo } from "./postProcess";

export interface WfcWorkerInput {
  width: number;
  height: number;
  density: number;
  edges: { top: number; bottom: number; left: number; right: number };
  continuityBonus: number;
}

export interface WfcWorkerOutput {
  success: boolean;
  mask?: string;
  ladders?: LadderInfo[];
  error?: string;
}

async function loadTileImages(tiles: WfcTile[]): Promise<WfcTile[]> {
  const cache = new Map<string, ImageBitmap>();
  return Promise.all(
    tiles.map(async (tile) => {
      if (!tile.imagePath) return tile;
      let imageData = cache.get(tile.imagePath);
      if (!imageData) {
        try {
          const response = await fetch(tile.imagePath);
          const blob = await response.blob();
          imageData = await createImageBitmap(blob);
          cache.set(tile.imagePath, imageData);
        } catch {
          return tile;
        }
      }
      return { ...tile, imageData };
    }),
  );
}

self.onmessage = async (e: MessageEvent<WfcWorkerInput>) => {
  const { width, height, density, edges, continuityBonus } = e.data;

  const tiles = await loadTileImages(TILES);

  const result = solve({ width, height, tiles, density, edges, continuityBonus });

  if (!result.success || !result.grid) {
    self.postMessage({
      success: false,
      error: "Generation failed after multiple attempts. Try different parameters.",
    } satisfies WfcWorkerOutput);
    return;
  }

  const { blob, ladders } = await gridToBlob(result.grid);
  const reader = new FileReader();
  reader.onload = () => {
    self.postMessage({
      success: true,
      mask: reader.result as string,
      ladders,
    } satisfies WfcWorkerOutput);
  };
  reader.readAsDataURL(blob);
};
