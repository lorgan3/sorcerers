import { Container, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../collision/collisionMask";
import { ComputedLayer, Map } from ".";
import { Killbox } from "./killbox";
import { UpdatingTexture } from "./updatingTexture";
import { rectangle6x16 } from "../collision/precomputed/rectangles";

export class Terrain {
  private background: Texture;
  private terrain: UpdatingTexture;

  private layerTextures: UpdatingTexture[];
  private layerSprites: Sprite[];

  public collisionMask: CollisionMask;
  public characterMask: CollisionMask;

  public readonly killbox: Killbox;

  public backgroundSprite: Sprite;
  public terrainSprite: Sprite;
  public foreground: Container;

  constructor(private map: Map) {
    this.collisionMask = map.collisionMask;
    this.characterMask = this.collisionMask.clone();

    this.terrain = new UpdatingTexture(map.terrain);
    this.terrainSprite = new Sprite(this.terrain.texture);
    this.terrainSprite.scale.set(6);

    this.background = Texture.from(map.background);
    this.backgroundSprite = new Sprite(this.background);
    this.backgroundSprite.scale.set(6);

    this.layerTextures = [];
    this.layerSprites = [];
    for (let layer of map.layers) {
      const texture = new UpdatingTexture(layer.data, layer.x, layer.y);
      this.layerTextures.push(texture);

      const sprite = new Sprite(texture.texture);
      sprite.position.set(layer.x, layer.y);
      this.layerSprites.push(sprite);
    }

    this.killbox = new Killbox(this.background.width, this.background.height);

    this.foreground = new Container();
    this.foreground.scale.set(6);
    this.foreground.addChild(...this.layerSprites, this.killbox);
  }

  get layers() {
    return this.map.layers;
  }

  setLayerVisibility(layer: ComputedLayer, revealed: boolean) {
    this.layerSprites[this.map.layers.indexOf(layer)].alpha = revealed
      ? 0.2
      : 1;
  }

  getSpawnLocations(
    distance = Math.round(Math.max(this.map.width, this.map.height) / 24),
    mask = rectangle6x16
  ) {
    const locations: Array<[number, number]> = [];
    const tester = CollisionMask.forRect(mask.width, mask.height + distance);

    for (
      let x = Math.round((this.map.width % distance) / 2) + distance;
      x < this.map.width - distance;
      x += distance
    ) {
      for (
        let y = Math.round((this.map.height % distance) / 2) + distance;
        y < this.map.height - distance;
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

    this.collisionMask.subtract(mask, x | 0, y | 0);
    this.characterMask.subtract(mask, x | 0, y | 0);
  }

  subtractCircle(x: number, y: number, r: number, mask: CollisionMask) {
    this.subtract(
      x - r,
      y - r,
      mask,
      (ctx) => {
        ctx.moveTo(x, y);
        ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
      },
      (ctx) => {
        ctx.moveTo(x, y);
        ctx.ellipse(x, y, r + 1, r + 1, 0, 0, Math.PI * 2);
      }
    );
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
