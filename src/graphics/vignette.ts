import { Sprite, Texture } from "pixi.js";

export class Vignette extends Sprite {
  private static fadeStep = 1 / 12;
  private static visibleAlpha = 1;
  private static textureSize = 512;

  private targetAlpha = 0;

  constructor(screenWidth: number, screenHeight: number) {
    super(Vignette.buildTexture());
    this.alpha = 0;
    this.eventMode = "none";
    this.resize(screenWidth, screenHeight);
  }

  private static buildTexture(): Texture {
    const size = Vignette.textureSize;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const cx = size / 2;
    const cy = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 1.05);
    gradient.addColorStop(0, "rgba(20, 30, 70, 0)");
    gradient.addColorStop(0.55, "rgba(20, 30, 70, 0)");
    gradient.addColorStop(1, "rgba(20, 30, 70, 0.6)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return Texture.from(canvas);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.width = screenWidth;
    this.height = screenHeight;
  }

  setVisible(visible: boolean) {
    this.targetAlpha = visible ? Vignette.visibleAlpha : 0;
  }

  tick(dt: number) {
    if (this.alpha === this.targetAlpha) return;
    const step = Vignette.fadeStep * dt;
    if (this.alpha < this.targetAlpha) {
      this.alpha = Math.min(this.targetAlpha, this.alpha + step);
    } else {
      this.alpha = Math.max(this.targetAlpha, this.alpha - step);
    }
  }
}
