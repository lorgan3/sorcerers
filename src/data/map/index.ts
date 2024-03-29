import { addMetadata, getMetadata } from "meta-png";
import { CollisionMask } from "../collision/collisionMask";
import { base64ToBytes, bytesToBase64 } from "../../util/data";

export interface Layer {
  data: string | Blob;
  x: number;
  y: number;
}

export interface ComputedLayer {
  data: OffscreenCanvas;
  x: number;
  y: number;
  cx: number;
  cy: number;
  right: number;
  bottom: number;
}

export interface Config {
  terrain: {
    data: string | Blob;
    mask?: string | ReturnType<CollisionMask["serialize"]>;
  };
  background: {
    data: string | Blob;
  };
  layers: Layer[];
}

const TERRAIN_KEY = "terrain";
const BACKGROUND_KEY = "background";
const LAYERS_KEY = "layers";
const MASK_KEY = "mask";
const VERSION_KEY = "version";

const VERSION = 1;
const THUMBNAIL_SIZE = 100;

export class Map {
  private _terrain?: OffscreenCanvas;
  private _background?: OffscreenCanvas;
  private _collisionMask?: CollisionMask;
  private _layers?: ComputedLayer[];
  private _width = 0;
  private _height = 0;

  public readonly load: Promise<void>;

  private constructor(private config: Config) {
    this.load = Promise.all([
      Map.createCanvasFromData(this.config.terrain.data),
      Map.createCanvasFromData(this.config.background.data),
      typeof this.config.terrain.mask === "string"
        ? Map.createCanvasFromData(this.config.terrain.mask)
        : undefined,
      ...config.layers.map((layer) => Map.createCanvasFromData(layer.data)),
    ]).then(([terrain, background, mask, ...layers]) => {
      this._terrain = terrain;
      this._background = background;
      this._layers = layers.map((layer, i) => {
        const { x, y } = config.layers[i];
        const r = (layer.width + layer.height) / 2 - 6;
        return {
          data: layer,
          x,
          y,
          cx: x + layer.width / 2,
          cy: y + layer.height / 2,
          right: x + layer.width,
          bottom: y + layer.height,
        };
      });

      if (typeof this.config.terrain.mask === "object") {
        this._collisionMask = CollisionMask.deserialize(
          this.config.terrain.mask as any
        );
      } else if (mask) {
        this._collisionMask = CollisionMask.fromAlpha(
          mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height)
        );
      } else {
        this._collisionMask = CollisionMask.fromAlpha(
          terrain
            .getContext("2d")!
            .getImageData(0, 0, terrain.width, terrain.height)
        );
      }

      this._width = terrain.width;
      this._height = terrain.height;
    });
  }

  static async parse(blob: Blob): Promise<Config> {
    let data = new Uint8Array(await blob.arrayBuffer());

    return {
      background: {
        data: Map.getMetadata(data, BACKGROUND_KEY),
      },
      terrain: {
        data: Map.getMetadata(data, TERRAIN_KEY),
        mask: Map.getMetadata(data, MASK_KEY, "") || undefined,
      },
      layers: JSON.parse(Map.getMetadata(data, LAYERS_KEY, "[]")),
    };
  }

  static async fromBlob(blob: Blob) {
    return Map.fromConfig(await Map.parse(blob));
  }

  static async fromConfig(config: Config) {
    const map = new Map(config);
    await map.load;

    return map;
  }

  async toConfig(forceMask?: boolean): Promise<Config> {
    const [terrain, background, ...layers] = await Promise.all([
      this.terrain!.convertToBlob({ type: "image/png" }),
      this._background!.convertToBlob({ type: "image/png" }),
      ...this._layers!.map((layer) =>
        layer.data.convertToBlob({ type: "image/png" })
      ),
    ]);

    return {
      terrain: {
        data: terrain,
        mask:
          this.config.terrain.mask || forceMask
            ? this.collisionMask!.serialize()
            : undefined,
      },
      background: {
        data: background,
      },
      layers: this._layers!.map((layer, i) => ({
        data: layers[i],
        x: layer.x,
        y: layer.y,
      })),
    };
  }

  async toBlob() {
    if (
      typeof this.config.terrain.data !== "string" ||
      typeof this.config.background.data !== "string"
    ) {
      throw new Error("Only string configs can be converted to blobs for now");
    }

    const [terrain, background, ...layers] = await Promise.all([
      Map.loadImage(this.config.terrain.data),
      Map.loadImage(this.config.background.data),
      ...this.config.layers.map((layer) => Map.loadImage(layer.data)),
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

    const scale = dw / terrain.width;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const { x, y } = this.config.layers[i];
      ctx.drawImage(
        layer,
        x * scale,
        y * scale,
        layer.width * scale,
        layer.height * scale
      );
    }

    const blob = await canvas.convertToBlob({ type: "image/png" });
    let data = new Uint8Array(await blob.arrayBuffer());

    data = addMetadata(data, VERSION_KEY, VERSION.toString());
    data = addMetadata(data, TERRAIN_KEY, this.config.terrain.data);
    data = addMetadata(data, BACKGROUND_KEY, this.config.background.data);
    data = addMetadata(data, LAYERS_KEY, JSON.stringify(this.config.layers));

    if (typeof this.config.terrain.mask === "string") {
      data = addMetadata(data, MASK_KEY, this.config.terrain.mask);
    }

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

  get layers() {
    return this._layers!;
  }

  get collisionMask() {
    return this._collisionMask!;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  public static loadImage(value: string | Blob) {
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

  private static getMetadata(data: Uint8Array, key: string, fallback?: string) {
    const value = getMetadata(data, key);

    if (value === undefined && fallback === undefined) {
      throw new Error(`Map does not contain data for ${key}`);
    }

    return (value !== undefined ? value : fallback) as string;
  }

  public static async createCanvasFromData(value: string | Blob) {
    const image = await Map.loadImage(value);

    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext("2d")!.drawImage(image, 0, 0);

    return canvas;
  }
}
