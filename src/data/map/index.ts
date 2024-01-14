import { addMetadata, getMetadata } from "meta-png";
import { CollisionMask } from "../collision/collisionMask";

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
  r: number;
  r2: number;
}

export interface Config {
  terrain: {
    data: string | Blob;
  };
  background: {
    data: string | Blob;
  };
  layers: Layer[];
}

const TERRAIN_KEY = "terrain";
const BACKGROUND_KEY = "background";
const LAYERS_KEY = "layers";
const VERSION_KEY = "version";

const VERSION = 1;
const THUMBNAIL_SIZE = 100;

export class Map {
  private _terrain?: OffscreenCanvas;
  private _background?: OffscreenCanvas;
  private _layers?: ComputedLayer[];
  private _width = 0;
  private _height = 0;

  public readonly load: Promise<void>;

  private constructor(private config: Config) {
    this.load = Promise.all([
      Map.createCanvasFromData(this.config.terrain.data),
      Map.createCanvasFromData(this.config.background.data),
      ...config.layers.map((layer) => Map.createCanvasFromData(layer.data)),
    ]).then(([terrain, background, ...layers]) => {
      this._terrain = terrain;
      this._background = background;
      this._collisionMask = terrain;
      this._layers = layers.map((layer, i) => {
        const { x, y } = config.layers[i];
        const r = (layer.width + layer.height) / 2 - 6;
        return {
          data: layer,
          x,
          y,
          cx: x + layer.width / 2,
          cy: y + layer.height / 2,
          r,
          r2: r * r,
        };
      });

      this._width = terrain.width;
      this._height = terrain.height;
    });
  }

  static async fromBlob(blob: Blob) {
    let data = new Uint8Array(await blob.arrayBuffer());

    return Map.fromConfig({
      background: {
        data: Map.getMetadata(data, BACKGROUND_KEY),
      },
      terrain: {
        data: Map.getMetadata(data, TERRAIN_KEY),
      layers: JSON.parse(Map.getMetadata(data, LAYERS_KEY, "[]")),
    });
  }

  static async fromConfig(config: Config) {
    const map = new Map(config);
    await map.load;

    return map;
  }

  async toConfig(): Promise<Config> {
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

  private static getMetadata(data: Uint8Array, key: string, fallback?: string) {
    const value = getMetadata(data, key);

    if (value === undefined && fallback === undefined) {
      throw new Error(`Map does not contain data for ${key}`);
    }

    return (value !== undefined ? value : fallback) as string;
  }

  private static async createCanvasFromData(value: string | Blob) {
    const image = await Map.loadImage(value);

    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext("2d")!.drawImage(image, 0, 0);

    return canvas;
  }
}
