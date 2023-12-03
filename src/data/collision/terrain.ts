import { Container, ImageBitmapResource, Sprite, Texture } from "pixi.js";
import { CollisionMask } from "./collisionMask";

export class Terrain extends Container {
  private foreground: Texture;

  private backgroundCanvas: OffscreenCanvas;
  private backgroundCtx: OffscreenCanvasRenderingContext2D;

  private background: Texture;

  public readonly characterMask: CollisionMask;

  constructor(
    public readonly collisionMask: CollisionMask,
    background: Texture<ImageBitmapResource>,
    foreground?: Texture
  ) {
    super();
    this.scale.set(6);

    this.characterMask = this.collisionMask.clone();

    this.backgroundCanvas = new OffscreenCanvas(
      background.width,
      background.height
    );
    this.backgroundCtx = this.backgroundCanvas.getContext("2d")!;
    this.backgroundCtx.drawImage(
      background.baseTexture.resource.source as ImageBitmap,
      0,
      0
    );

    this.backgroundCtx.globalCompositeOperation = "destination-out";
    this.background = Texture.from(this.backgroundCanvas);

    if (!foreground) {
      const canvas = document.createElement("canvas");
      canvas.width = background.width;
      canvas.height = background.height;

      this.foreground = Texture.from(canvas);
    } else {
      this.foreground = foreground;
    }

    this.addChild(new Sprite(this.background), new Sprite(this.foreground));
  }

  subtract(x: number, y: number, r: number, mask: CollisionMask) {
    this.backgroundCtx.moveTo(x, y);
    this.backgroundCtx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
    this.backgroundCtx.fill();
    this.background.update();

    this.collisionMask.subtract(mask, x - r, y - r);
    this.characterMask.subtract(mask, x - r, y - r);
  }
}
