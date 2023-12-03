import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../util/assets/assetsContainer";

export class Range extends Container {
  indicator: Sprite;

  private initialDist = 0;
  private _power = 0;

  constructor(x: number, y: number, d = 32) {
    super();
    this.pivot.set(-d, 32);
    this.position.set(x, y);
    this.scale.set(2);
    this.visible = false;

    const frame =
      AssetsContainer.instance.assets!["atlas"].textures["spells_range.png"];

    const background = new Sprite(frame);
    background.alpha = 0.5;

    this.indicator = new Sprite(frame);

    this.addChild(background, this.indicator);
  }

  update(x: number, y: number) {
    const point = this.getGlobalPosition();

    if (!this.visible) {
      this.visible = true;
      this.initialDist =
        Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) - 20;
    }

    this.rotation = Math.atan2(y - point.y, x - point.x);

    this._power = Math.min(
      Math.max(
        0,
        (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) -
          this.initialDist) /
          100
      ),
      1
    );

    this.indicator.scale.set(this._power);
    this.indicator.position.y = 32 * (1 - this._power);
  }

  stop() {
    const wasVisible = this.visible;
    this.visible = false;

    return wasVisible;
  }

  get power() {
    return this._power;
  }
}
