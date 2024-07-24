import { Container, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../collision/collisionMask";
import { ComputedLayer, Map } from ".";
import { Killbox } from "./killbox";
import { UpdatingTexture } from "./updatingTexture";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { probeX } from "./utils";

export class Terrain {
  private background?: Texture;
  private terrain: UpdatingTexture;

  private layerTextures: UpdatingTexture[];
  private layerSprites: Sprite[];

  public collisionMask: CollisionMask;
  public characterMask: CollisionMask;

  public readonly killbox: Killbox;

  public backgroundSprite?: Sprite;
  public terrainSprite: Sprite;
  public foreground: Container;

  constructor(private map: Map) {
    this.collisionMask = map.collisionMask;
    this.characterMask = this.collisionMask.clone();

    this.terrain = new UpdatingTexture(map.terrain, map.scaleMultiplier);
    this.terrainSprite = new Sprite(this.terrain.texture);
    this.terrainSprite.scale.set(map.scale);

    if (map.background) {
      this.background = Texture.from(map.background);
      this.backgroundSprite = new Sprite(this.background);
      this.backgroundSprite.scale.set(map.scale);
    }

    this.layerTextures = [];
    this.layerSprites = [];
    for (let layer of map.layers) {
      const texture = new UpdatingTexture(
        layer.data,
        map.scaleMultiplier,
        layer.x,
        layer.y
      );
      this.layerTextures.push(texture);

      const sprite = new Sprite(texture.texture);
      sprite.position.set(
        layer.x * map.scaleMultiplier,
        layer.y * map.scaleMultiplier
      );
      this.layerSprites.push(sprite);
    }

    this.killbox = new Killbox(
      this.map.width,
      this.map.height,
      map.scaleMultiplier
    );

    this.foreground = new Container();
    this.foreground.scale.set(map.scale);
    this.foreground.addChild(...this.layerSprites, this.killbox);
  }

  get layers() {
    return this.map.layers;
  }

  get width() {
    return this.map.width;
  }

  get height() {
    return this.map.height;
  }

  get scale() {
    return this.map.scale;
  }

  setLayerVisibility(layer: ComputedLayer, revealed: boolean) {
    this.layerSprites[this.map.layers.indexOf(layer)].alpha = revealed
      ? 0.2
      : 1;
  }

  getSpawnLocations(distance?: number, mask = rectangle6x16) {
    if (!distance) {
      distance = Math.round(
        Math.max(this.map.bbox.width, this.map.bbox.height) / 24
      );
    }

    const locations: Array<[number, number]> = [];
    const tester = CollisionMask.forRect(1, mask.height + distance);

    for (
      let x =
        Math.round(this.map.bbox.left + (this.map.bbox.width % distance) / 2) +
        distance;
      x < this.map.bbox.right - distance;
      x += distance
    ) {
      for (
        let y =
          Math.round(
            this.map.bbox.top + (this.map.bbox.height % distance) / 2
          ) + distance;
        y < this.map.bbox.bottom - distance;
        y += distance
      ) {
        // In the ground, skip.
        if (this.collisionMask.collidesWith(mask, x, y)) {
          continue;
        }

        // No ground here, skip.
        if (!this.collisionMask.collidesWith(tester, x, y)) {
          continue;
        }

        let d = distance;
        let y2 = y;
        while (d > 1) {
          d /= 2;

          if (!this.collisionMask.collidesWith(mask, x, Math.ceil(y2 + d))) {
            y2 += d;
          }
        }

        locations.push([x, Math.ceil(y2)]);
        y = Math.ceil(y2) + distance;
      }
    }

    if (locations.length === 0) {
      throw new Error("Terrain has no valid spawn locations");
    }

    return locations;
  }

  getRandomItemLocation(gravity?: boolean, mask?: CollisionMask) {
    for (let i = 0; i < 30; i++) {
      const x = Math.round(
        this.map.bbox.left + Math.random() * this.map.bbox.width
      );
      let y = Math.round(
        this.map.bbox.top +
          Math.random() *
            Math.min(
              this.map.bbox.height,
              this.killbox.level - this.map.bbox.top
            )
      );

      if (mask) {
        if (this.collisionMask.collidesWith(mask, x, y)) {
          continue;
        }
      } else {
        if (this.collisionMask.collidesWithPoint(x, y)) {
          continue;
        }
      }

      if (!gravity) {
        if (mask) {
          if (!this.collisionMask.collidesWith(mask, x, y)) {
            return [x, y] as const;
          }

          continue;
        }

        return [x, y] as const;
      }

      if (mask) {
        while (!this.collisionMask.collidesWith(mask, x, y + mask.height)) {
          if (y > this.killbox.level || y > this.map.height) {
            break;
          }

          y += mask.height;
        }

        if (y > this.killbox.level || y > this.map.height) {
          continue;
        }

        while (!this.collisionMask.collidesWith(mask, x, y + 1)) {
          y += 1;
        }

        if (y > this.killbox.level || y > this.map.height) {
          continue;
        }

        return [x, y] as const;
      }

      return [x, probeX(this.collisionMask, x, y)] as const;
    }

    return null;
  }

  subtract(
    x: number,
    y: number,
    mask: CollisionMask,
    fn: (ctx: OffscreenCanvasRenderingContext2D) => void,
    layerFn?: (ctx: OffscreenCanvasRenderingContext2D) => void
  ) {
    this.terrain.update("destination-out", fn);
    for (let layer of this.layerTextures) {
      layer.update("destination-out", layerFn ?? fn);
    }

    const hit = this.collisionMask.collidesWith(mask, x | 0, y | 0);
    if (hit) {
      this.collisionMask.subtract(mask, x | 0, y | 0);
    }

    this.characterMask.subtract(mask, x | 0, y | 0);

    return hit;
  }

  subtractCircle(x: number, y: number, r: number, mask: CollisionMask) {
    return this.subtract(
      x - r,
      y - r,
      mask,
      (ctx) => {
        ctx.moveTo(x, y);
        ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
      },
      r > 4
        ? (ctx) => {
            ctx.moveTo(x, y);
            ctx.ellipse(x, y, r + 2, r + 2, 0, 0, Math.PI * 2);
          }
        : undefined
    );
  }

  add(
    x: number,
    y: number,
    mask: CollisionMask,
    fn: (ctx: OffscreenCanvasRenderingContext2D) => void,
    layerFn?: (ctx: OffscreenCanvasRenderingContext2D) => void
  ) {
    this.terrain.update("destination-over", fn);
    for (let layer of this.layerTextures) {
      layer.update("destination-over", layerFn ?? fn);
    }

    this.collisionMask.add(mask, x | 0, y | 0);
    this.characterMask.add(mask, x | 0, y | 0);
  }

  draw(
    fn: (ctx: OffscreenCanvasRenderingContext2D) => void,
    layerFn?: (ctx: OffscreenCanvasRenderingContext2D) => void
  ) {
    this.terrain.update("source-atop", fn);
    for (let layer of this.layerTextures) {
      layer.update("source-atop", layerFn ?? fn);
    }
  }

  serialize() {
    return this.map.toConfig(true);
  }
}
