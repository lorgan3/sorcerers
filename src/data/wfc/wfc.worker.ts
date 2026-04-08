import { TILES } from "./tiles";
import { solve, type SeedTile, type WfcParams } from "./wfc";
import { gridToBlob, seedsToBlob } from "./postProcess";

export interface WfcWorkerInput {
  width: number;
  height: number;
  density: number;
  edges: WfcParams["edges"];
  seeds?: SeedTile[];
  seedsOnly?: boolean;
  flatness?: number;
}

self.onmessage = async (e: MessageEvent<WfcWorkerInput>) => {
  const { width, height, density, edges, seeds, seedsOnly, flatness = 0.5 } = e.data;

  // Apply flatness: 0 = max slopes, 1 = no slopes
  const tiles = TILES.map((t) =>
    t.id.startsWith("slope")
      ? { ...t, weight: t.weight * (1 - flatness) }
      : t
  );

  if (seedsOnly && seeds) {
    const blob = await seedsToBlob(width, height, seeds, tiles);
    const reader = new FileReader();
    reader.onload = () => {
      self.postMessage({ success: true, data: reader.result });
    };
    reader.readAsDataURL(blob);
    return;
  }

  const result = solve({ width, height, tiles, density, edges, seeds });

  if (!result.success || !result.grid) {
    self.postMessage({ success: false, error: "Generation failed after multiple attempts. Try different parameters." });
    return;
  }

  const blob = await gridToBlob(result.grid, density, seeds);
  const reader = new FileReader();
  reader.onload = () => {
    self.postMessage({ success: true, data: reader.result });
  };
  reader.readAsDataURL(blob);
};
