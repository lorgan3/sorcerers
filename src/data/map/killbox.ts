import { Container, Graphics, Texture, TilingSprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { CollisionMask } from "../collision/collisionMask";

const ANIMATION_SPEED = 0.1;
const RISE_SPEED = 1;
const SPRITE_OFFSET = 5;

export class Killbox extends Container {
  private sprite: TilingSprite;
  private bottom: Graphics;

  private animation: Texture[];
  private index = 0;
  private _level: number;
  private newLevel: number;

  constructor(width: number, height: number) {
    super();
    this.position.y = height - SPRITE_OFFSET;
    this._level = height;
    this.newLevel = this._level;

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.animation = atlas.animations["wave"];

    this.sprite = new TilingSprite(this.animation[0], width, 32);
    this.sprite.tint = 0xa449d0;
    this.sprite.scale.y = 0.3;
    this.sprite.alpha = 0.7;

    this.bottom = new Graphics();
    this.bottom.beginFill(0x783fbc, 0.7);
    this.bottom.drawRect(0, 0, 1, 1);
    this.bottom.endFill();
    this.bottom.width = width;
    this.bottom.position.y = 9.6;

    this.addChild(this.sprite, this.bottom);
  }

  tick(dt: number) {
    if (this._level > this.newLevel) {
      this._level = Math.max(this.newLevel, this._level - RISE_SPEED * dt);
      this.position.y = this._level - SPRITE_OFFSET;
      this.bottom.height = this._level - SPRITE_OFFSET;
    }

    const index = (this.index + dt * ANIMATION_SPEED) % this.animation.length;

    if ((index | 0) !== (this.index | 0)) {
      this.sprite.texture = this.animation[index | 0];
    }
    this.index = index;
  }

  collidesWith(other: CollisionMask, dx: number, dy: number) {
    return dy / 6 + other.height > this._level;
  }

  rise(amount: number) {
    this.newLevel -= amount;
  }

  get level() {
    return this.newLevel;
  }

  set level(value: number) {
    this.newLevel = value;
  }
}
