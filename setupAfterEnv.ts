import { expect } from "vitest";

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
