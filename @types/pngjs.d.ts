declare module "pngjs" {
  export interface PNGOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    checkCRC?: boolean;
    deflateChunkSize?: number;
    deflateLevel?: number;
    deflateStrategy?: number;
    deflateFactory?: any;
    filterType?: number | number[];
    colorType?: number;
    inputColorType?: number;
    bitDepth?: number;
    inputHasAlpha?: boolean;
    bgColor?: { red: number; green: number; blue: number };
    skipRescale?: boolean;
  }

  export class PNG {
    constructor(options?: PNGOptions);
    width: number;
    height: number;
    data: Uint8Array;
    gamma: number;
    on(event: string, callback: (...args: any[]) => void): this;
    pack(): this;
    parse(
      data: string | Uint8Array,
      callback?: (error: Error, data: PNG) => void
    ): this;
    static sync: {
      read(buffer: Uint8Array, options?: PNGOptions): PNG;
      write(png: PNG): Uint8Array;
    };
  }
}
