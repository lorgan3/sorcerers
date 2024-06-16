declare module "binpacking" {
  interface Block {
    w: number;
    h: number;
  }

  interface Resolution {
    used: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
    down: Resolution;
    right: Resolution;
  }

  class Packer {
    constructor(width: number, height: number);

    // Each block will contain a resolution.
    public fit(blocks: Block[]): void;
  }

  class GrowingPacker {
    public root: Resolution;

    // Each block will contain a resolution.
    public fit(blocks: Block[]): void;
  }

  export type { Block, Resolution };
  export { Packer, GrowingPacker };
}
