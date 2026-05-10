import { Graphics } from "pixi.js";
import { Viewport } from "../data/map/viewport";

export class Letterbox extends Graphics {
  constructor(private viewport: Viewport) {
    super();
    this.eventMode = "none";
  }

  update() {
    const screenW = this.viewport.screenWidth;
    const screenH = this.viewport.screenHeight;
    const scale = this.viewport.scale.x;
    const worldOnScreenW = this.viewport.worldWidth * scale;
    const worldOnScreenH = this.viewport.worldHeight * scale;
    const left = this.viewport.position.x;
    const top = this.viewport.position.y;
    const right = left + worldOnScreenW;
    const bottom = top + worldOnScreenH;

    this.clear();

    if (left > 0) {
      this.rect(0, 0, left, screenH).fill(0x000000);
    }
    if (right < screenW) {
      this.rect(right, 0, screenW - right, screenH).fill(0x000000);
    }
    if (top > 0) {
      this.rect(0, 0, screenW, top).fill(0x000000);
    }
    if (bottom < screenH) {
      this.rect(0, bottom, screenW, screenH - bottom).fill(0x000000);
    }
  }
}
