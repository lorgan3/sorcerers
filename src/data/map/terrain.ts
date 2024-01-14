import { Container, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../collision/collisionMask";
import { ComputedLayer, Map } from ".";
import { ellipse9x16 } from "../collision/precomputed/circles";
import { Killbox } from "./killbox";
import { UpdatingTexture } from "./updatingTexture";

export class Terrain {
  private background: Texture;
  private terrain: UpdatingTexture;

  private layerTextures: UpdatingTexture[];
  private layerSprites: Sprite[];

  public collisionMask: CollisionMask;
  public characterMask: CollisionMask;

  public readonly killbox: Killbox;

  public container: Container;
  public foreground: Container;

  constructor(private map: Map) {
    this.collisionMask = map.collisionMask;
    this.characterMask = this.collisionMask.clone();

    this.terrain = new UpdatingTexture(map.terrain);
    this.background = Texture.from(map.background);

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

    this.container = new Container();
    this.container.scale.set(6);
    this.container.addChild(
      new Sprite(this.background),
      new Sprite(this.terrain.texture)
    );
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
    mask = ellipse9x16
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
    fn: (ctx: OffscreenCanvasRenderingContext2D) => void,
    mask: CollisionMask
  ) {
    fn(this.terrainCtx);
    this.terrainCtx.fill();
    this.terrain.update();

    this.collisionMask.subtract(mask, x | 0, y | 0);
    this.characterMask.subtract(mask, x | 0, y | 0);
  }

  subtractCircle(x: number, y: number, r: number, mask: CollisionMask) {
    this.subtract(
      x - r,
      y - r,
      (ctx) => {
        ctx.moveTo(x, y);
        ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
      },
      mask
    );
  }

  // @TODO: a system for sending an in progress map

  serialize() {
    return this.map.toConfig();

    // return {
    //   ...this.collisionMask.serialize(),
    //   background: this.terrainCtx.getImageData(
    //     0,
    //     0,
    //     this.map.background.width,
    //     this.map.background.height
    //   ).data.buffer,
    // };
  }

  // deserialize(data: any) {
  //   this.collisionMask = CollisionMask.deserialize(data);
  //   this.characterMask = this.collisionMask.clone();

  //   this.terrainCtx.globalCompositeOperation = "multiply";
  //   this.map.background.width = data.width;
  //   this.map.background.height = data.height;
  //   this.terrainCtx.putImageData(
  //     new ImageData(
  //       new Uint8ClampedArray(data.background),
  //       data.width,
  //       data.height
  //     ),
  //     0,
  //     0
  //   );
  //   this.terrainCtx.globalCompositeOperation = "destination-out";

  //   this.terrain.update();
  // }
}
