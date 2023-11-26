interface CustomMatchers<R = unknown> {
  toApproximate(result: number): R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export {};
