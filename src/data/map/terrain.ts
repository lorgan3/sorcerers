import { Container, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../collision/collisionMask";
import { Map } from ".";

export class Terrain extends Container {
  private background: Texture;
  private terrain: Texture;
  private terrainCtx: OffscreenCanvasRenderingContext2D;

  public collisionMask: CollisionMask;
  public characterMask: CollisionMask;

  constructor(private map: Map) {
    super();
    this.scale.set(6);

    this.collisionMask = map.collisionMask;
    this.characterMask = this.collisionMask.clone();

    this.terrainCtx = map.terrain.getContext("2d")!;
    this.terrainCtx.globalCompositeOperation = "destination-out";
    this.terrain = Texture.from(map.terrain);

    this.background = Texture.from(map.background);

    this.addChild(new Sprite(this.background), new Sprite(this.terrain));
  }

  subtract(x: number, y: number, r: number, mask: CollisionMask) {
    this.terrainCtx.moveTo(x, y);
    this.terrainCtx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
    this.terrainCtx.fill();
    this.terrain.update();

    this.collisionMask.subtract(mask, x - r, y - r);
    this.characterMask.subtract(mask, x - r, y - r);
  }

  serialize() {
    return {
      ...this.collisionMask.serialize(),
      background: this.terrainCtx.getImageData(
        0,
        0,
        this.map.background.width,
        this.map.background.height
      ).data.buffer,
    };
  }

  deserialize(data: any) {
    this.collisionMask = CollisionMask.deserialize(data);
    this.characterMask = this.collisionMask.clone();

    this.terrainCtx.globalCompositeOperation = "multiply";
    this.map.background.width = data.width;
    this.map.background.height = data.height;
    this.terrainCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(data.background),
        data.width,
        data.height
      ),
      0,
      0
    );
    this.terrainCtx.globalCompositeOperation = "destination-out";

    this.terrain.update();
  }
}
