import { addMetadata, getMetadata } from "meta-png";
import { CollisionMask } from "../collision/collisionMask";

export interface Config {
  terrain: {
    data: string | Blob;
  };
  background: {
    data: string | Blob;
  };
}

const TERRAIN_KEY = "terrain";
const BACKGROUND_KEY = "background";
const VERSION_KEY = "version";

const VERSION = 1;
const THUMBNAIL_SIZE = 100;

export class Map {
  private _terrain?: OffscreenCanvas;
  private _background?: OffscreenCanvas;
  private _collisionMask?: OffscreenCanvas;
  private _width = 0;
  private _height = 0;

  public readonly load: Promise<void>;

  private constructor(private config: Config) {
    this.load = Promise.all([
      Map.createCanvasFromData(this.config.terrain.data),
      Map.createCanvasFromData(this.config.background.data),
    ]).then(([terrain, background]) => {
      this._terrain = terrain;
      this._background = background;
      this._collisionMask = terrain;
      this._width = terrain.width;
      this._height = terrain.height;
    });
  }

  static async fromBlob(blob: Blob) {
    let data = new Uint8Array(await blob.arrayBuffer());

    return new Map({
      background: {
        data: Map.getMetadata(data, BACKGROUND_KEY),
      },
      terrain: {
        data: Map.getMetadata(data, TERRAIN_KEY),
      },
    });
  }

  static async fromConfig(config: Config) {
    const map = new Map(config);
    await map.load;

    return map;
  }

  async toConfig(): Promise<Config> {
    const [terrain, background] = await Promise.all([
      this.terrain!.convertToBlob({ type: "image/png" }),
      this._background!.convertToBlob({ type: "image/png" }),
    ]);

    return {
      terrain: {
        data: terrain,
      },
      background: {
        data: background,
      },
    };
  }

  async toBlob() {
    if (
      typeof this.config.terrain.data !== "string" ||
      typeof this.config.background.data !== "string"
    ) {
      throw new Error("Only string configs can be converted to blobs for now");
    }

    const [terrain, background] = await Promise.all([
      Map.loadImage(this.config.terrain.data),
      Map.loadImage(this.config.background.data),
    ]);

    let dw: number, dh: number;

    if (terrain.width > terrain.height) {
      dw = THUMBNAIL_SIZE;
      dh = Math.round((terrain.height / terrain.width) * THUMBNAIL_SIZE);
    } else {
      dw = Math.round((terrain.width / terrain.height) * THUMBNAIL_SIZE);
      dh = THUMBNAIL_SIZE;
    }

    const canvas = new OffscreenCanvas(dw, dh);
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(background, 0, 0, dw, dh);
    ctx.drawImage(terrain, 0, 0, dw, dh);

    const blob = await canvas.convertToBlob({ type: "image/png" });
    let data = new Uint8Array(await blob.arrayBuffer());

    data = addMetadata(data, VERSION_KEY, VERSION.toString());
    data = addMetadata(data, TERRAIN_KEY, this.config.terrain.data);
    data = addMetadata(data, BACKGROUND_KEY, this.config.background.data);

    return new Blob([data], {
      type: "image/png",
    });
  }

  get terrain() {
    return this._terrain!;
  }

  get background() {
    return this._background!;
  }

  get collisionMask() {
    return CollisionMask.fromAlpha(
      this._collisionMask!.getContext("2d")!.getImageData(
        0,
        0,
        this._collisionMask!.width,
        this._collisionMask!.height
      )
    );
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  private static loadImage(value: string | Blob) {
    if (typeof value === "string") {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;

        image.src = value;
      });
    }

    return createImageBitmap(value);
  }

  private static getMetadata(data: Uint8Array, key: string) {
    const value = getMetadata(data, key);

    if (value === undefined) {
      throw new Error(`Map does not contain data for ${key}`);
    }

    return value;
  }

  private static async createCanvasFromData(value: string | Blob) {
    const image = await Map.loadImage(value);

    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext("2d")!.drawImage(image, 0, 0);

    return canvas;
  }
}
