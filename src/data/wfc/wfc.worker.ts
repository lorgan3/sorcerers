import { TILES, type WfcTile } from "./tiles";
import { createRng, MAX_RETRIES, solveOnce, SOLVE_TIMEOUT } from "./wfc";
import { gridToBlob, type LadderInfo } from "./postProcess";

export interface WfcWorkerInput {
  width: number;
  height: number;
  density: number;
  edges: { top: number; bottom: number; left: number; right: number };
  continuityBonus: number;
  preventBlockages: boolean;
  densityMask?: Uint8Array;
}

export type AttemptOutcome = "started" | "failed" | "timed-out";

export type WfcWorkerOutput =
  | {
      type?: "result";
      success: boolean;
      mask?: string;
      ladders?: LadderInfo[];
      error?: string;
    }
  | {
      type: "progress";
      attempt: number;
      maxAttempts: number;
      outcome: AttemptOutcome;
      attemptDurationMs?: number;
    };

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
  try {
    const { width, height, density, edges, continuityBonus, preventBlockages, densityMask } = e.data;

    const filteredTiles = preventBlockages ? TILES.filter((t) => t.id !== "wall") : TILES;
    const tiles = await loadTileImages(filteredTiles);

    const ATTEMPT_BUDGET_MS = 400;
    const params = { width, height, tiles, density, edges, continuityBonus, preventBlockages, densityMask, maxTimeMs: ATTEMPT_BUDGET_MS };

    let solvedGrid: WfcTile[][] | null = null;
    let timedOut = 0;
    let failed = 0;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      self.postMessage({
        type: "progress",
        attempt,
        maxAttempts: MAX_RETRIES,
        outcome: "started",
      } satisfies WfcWorkerOutput);
      // Yield to the event loop so progress messages flush before the next sync attempt.
      await new Promise((r) => setTimeout(r, 0));
      const attemptStart = performance.now();
      const seed = Date.now() + attempt;
      const rng = createRng(seed);
      const result = solveOnce(params, rng);
      const attemptDurationMs = performance.now() - attemptStart;
      if (result && result !== SOLVE_TIMEOUT) {
        solvedGrid = result;
        break;
      }
      const outcome: AttemptOutcome = result === SOLVE_TIMEOUT ? "timed-out" : "failed";
      if (outcome === "timed-out") timedOut++;
      else failed++;
      self.postMessage({
        type: "progress",
        attempt,
        maxAttempts: MAX_RETRIES,
        outcome,
        attemptDurationMs,
      } satisfies WfcWorkerOutput);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (!solvedGrid) {
      const detail =
        timedOut > 0 && failed > 0
          ? `${timedOut}/${MAX_RETRIES} attempts timed out (each capped at ${ATTEMPT_BUDGET_MS}ms), ${failed}/${MAX_RETRIES} ran out of options.`
          : timedOut > 0
            ? `All ${MAX_RETRIES} attempts timed out (each capped at ${ATTEMPT_BUDGET_MS}ms) — the search space is too large for this setup.`
            : `All ${MAX_RETRIES} attempts ran out of options — the constraints are unsatisfiable for this setup.`;
      self.postMessage({
        success: false,
        error: `Generation failed. ${detail} Try a smaller grid, lower density, or relax constraints.`,
      } satisfies WfcWorkerOutput);
      return;
    }

    const { blob, ladders } = await gridToBlob(solvedGrid);
    const reader = new FileReader();
    reader.onload = () => {
      self.postMessage({
        success: true,
        mask: reader.result as string,
        ladders,
      } satisfies WfcWorkerOutput);
    };
    reader.onerror = () => {
      self.postMessage({
        success: false,
        error: "Failed to encode generated mask.",
      } satisfies WfcWorkerOutput);
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    self.postMessage({
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error during generation.",
    } satisfies WfcWorkerOutput);
  }
};
