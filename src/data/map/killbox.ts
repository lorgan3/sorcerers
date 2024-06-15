import { Container, Graphics, Texture, TilingSprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { CollisionMask } from "../collision/collisionMask";

const ANIMATION_SPEED = 0.1;
const RISE_SPEED = 0.15;
const SPRITE_OFFSET = 5;

export class Killbox extends Container {
  private sprite: TilingSprite;
  private bottom: Graphics;

  private animation: Texture[];
  private index = 0;
  private _level: number;
  private newLevel: number;

  constructor(width: number, private initialHeight: number) {
    super();
    this.position.y = initialHeight - SPRITE_OFFSET;
    this._level = initialHeight;
    this.newLevel = this._level;

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.animation = atlas.animations["wave"];

    this.sprite = new TilingSprite({
      texture: this.animation[0],
      width,
      height: 32,
    });
    this.sprite.tint = 0xa449d0;
    this.sprite.scale.y = 0.3;
    this.sprite.alpha = 0.7;

    this.bottom = new Graphics();
    this.bottom.rect(0, 0, 1, 1).fill({ color: 0x783fbc, alpha: 0.7 });
    this.bottom.width = width;
    this.bottom.position.y = 9.6;

    this.addChild(this.sprite, this.bottom);
  }

  tick(dt: number) {
    if (this._level > this.newLevel) {
      this._level = Math.max(this.newLevel, this._level - RISE_SPEED * dt);
      this.position.y = this._level - SPRITE_OFFSET;
      this.bottom.scale.y = this.initialHeight - this._level - SPRITE_OFFSET;
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
