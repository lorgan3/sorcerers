import { expect, vi } from "vitest";

// OffscreenCanvas is not available in jsdom — provide a minimal stub
// so modules that import precomputed collision shapes can load.
if (typeof globalThis.OffscreenCanvas === "undefined") {
  (globalThis as any).OffscreenCanvas = class OffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      const w = this.width;
      const h = this.height;
      // Use a Proxy so any canvas 2D method call is a no-op,
      // while specific methods that return values are handled.
      return new Proxy(
        {
          fillStyle: "",
          strokeStyle: "",
          globalCompositeOperation: "",
          createRadialGradient: () => ({ addColorStop: vi.fn() }),
          getImageData: () => ({
            data: new Uint8ClampedArray(w * h * 4),
          }),
        },
        {
          get(target: any, prop: string) {
            if (prop in target) return target[prop];
            return vi.fn();
          },
          set(target: any, prop: string, value: any) {
            target[prop] = value;
            return true;
          },
        }
      );
    }
    transferToImageBitmap() {
      return {};
    }
  };
}

expect.extend({
  toApproximate(expected: number, actual: number) {
    return {
      pass:
        (!isFinite(expected) && !isFinite(actual)) ||
        Math.abs(actual - expected) <= Number.EPSILON,
      message: () => `Expected "${expected}" to approximate "${actual}".`,
    };
  },
});
