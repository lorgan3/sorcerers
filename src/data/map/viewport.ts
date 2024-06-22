import { Container, Rectangle } from "pixi.js";

export class Viewport extends Container {
  private cx = 0;
  private cy = 0;

  constructor(
    public screenWidth: number,
    public screenHeight: number,
    public readonly worldWidth: number,
    public readonly worldHeight: number,
    public readonly worldScale: number
  ) {
    super();

    this.eventMode = "static";
    this.interactiveChildren = false;
    this.hitArea = new Rectangle(0, 0, this.worldWidth, this.worldHeight);

    this.cx = this.worldWidth / 2;
    this.cy = this.worldHeight / 2;

    this.updatePosition();
  }

  resize(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  setZoom(scale: number) {
    if (scale === this.scale.x) {
      return;
    }

    this.scale.set(scale);
    this.updatePosition();
  }

  moveCenter(x: number, y: number) {
    this.cx = x;
    this.cy = y;

    this.updatePosition();
  }

  private updatePosition() {
    this.position.set(
      -this.cx * this.scale.x + this.screenWidth / 2,
      -this.cy * this.scale.y + this.screenHeight / 2
    );
  }

  get center() {
    return [this.cx, this.cy];
  }

  get worldScreenWidth() {
    return this.screenWidth / this.scale.x;
  }

  get worldScreenHeight() {
    return this.screenHeight / this.scale.y;
  }

  get top() {
    return -this.position.y / this.scale.x;
  }

  get left() {
    return -this.position.x / this.scale.y;
  }
}
