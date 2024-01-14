import { Texture } from "pixi.js";

export class UpdatingTexture {
  private ctx: OffscreenCanvasRenderingContext2D;
  public readonly texture: Texture;

  constructor(canvas: OffscreenCanvas, offsetX = 0, offsetY = 0) {
    this.ctx = canvas.getContext("2d")!;
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.translate(-offsetX, -offsetY);

    this.texture = Texture.from(canvas);
  }

  update(fn: (ctx: OffscreenCanvasRenderingContext2D) => void) {
    fn(this.ctx);
    this.ctx.fill();

    this.texture.update();
  }
}
