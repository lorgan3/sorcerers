import type { LadderInfo } from "./postProcess";
import WfcWorker from "./wfc.worker?worker";

export interface WfcSettings {
  width: number;
  height: number;
  density: number;
  /** 0 = busy/varied terrain, 1 = smooth/sweeping terrain. */
  smoothness: number;
  preventBlockages: boolean;
  densityMask: Uint8Array | null;
}

export interface WfcResult {
  mask: string;
  ladders: LadderInfo[];
}

// Runs the WFC worker once. The returned promise resolves with the generated
// mask + ladders or rejects with an Error so callers always get to react to
// failures. The worker handle is returned too so callers can terminate it
// early (e.g. on unmount).
export function runWfc(settings: WfcSettings): {
  promise: Promise<WfcResult>;
  worker: Worker;
} {
  const worker = new WfcWorker();

  const promise = new Promise<WfcResult>((resolve, reject) => {
    if (!settings.densityMask) {
      reject(new Error("No density mask to generate from."));
      return;
    }

    worker.postMessage({
      width: settings.width,
      height: settings.height,
      smoothness: settings.smoothness,
      preventBlockages: settings.preventBlockages,
      densityMask: settings.densityMask,
    });

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === "progress") return;
      worker.terminate();
      if (e.data.success && e.data.mask) {
        resolve({ mask: e.data.mask, ladders: e.data.ladders ?? [] });
      } else {
        reject(new Error(e.data.error ?? "Generation failed."));
      }
    };

    worker.onerror = () => {
      worker.terminate();
      reject(new Error("An unexpected error occurred."));
    };
  });

  return { promise, worker };
}
