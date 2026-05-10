import { Sprite, Texture } from "pixi.js";

export class Vignette extends Sprite {
  // Linear easing toward the visible/hidden alpha. Ticks per frame; ~12
  // frames at 60fps to fully fade in/out.
  private static fadeStep = 1 / 12;
  private static visibleAlpha = 1;

  private targetAlpha = 0;

  constructor(texture: Texture, screenWidth: number, screenHeight: number) {
    super(texture);
    this.alpha = 0;
    this.eventMode = "none";
    this.resize(screenWidth, screenHeight);
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
