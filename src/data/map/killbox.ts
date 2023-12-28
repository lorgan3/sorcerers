import { Container, Texture, TilingSprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { CollisionMask } from "../collision/collisionMask";
import { Level } from "./level";
import { Character } from "../character";
import { GenericDamage } from "../damage/genericDamage";
import { TargetList } from "../damage/targetList";

const ANIMATION_SPEED = 0.1;
const RISE_SPEED = 1;
const SPRITE_OFFSET = 5;

export class Killbox extends Container {
  private sprite: TilingSprite;

  private animation: Texture[];
  private index = 0;
  private level: number;
  private newLevel: number;

  constructor(width: number, height: number) {
    super();
    this.position.y = height - SPRITE_OFFSET;
    this.level = height;
    this.newLevel = this.level;

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.animation = atlas.animations["wave"];

    this.sprite = new TilingSprite(this.animation[0], width, 32);
    this.sprite.tint = 0xa449d0;
    this.sprite.scale.y = 0.3;
    this.sprite.alpha = 0.7;

    this.addChild(this.sprite);
  }

  tick(dt: number) {
    if (this.level > this.newLevel) {
      this.level = Math.max(this.newLevel, this.level - RISE_SPEED * dt);
      this.position.y = this.level - SPRITE_OFFSET;

      for (let entity of Level.instance.hurtables) {
        if (
          entity instanceof Character &&
          this.collidesWith(
            entity.body.mask,
            entity.position.x,
            entity.position.y
          )
        ) {
          Level.instance.damage(
            new GenericDamage(new TargetList().add(entity, 999))
          );
        }
      }
    }

    const index = (this.index + dt * ANIMATION_SPEED) % this.animation.length;

    if ((index | 0) !== (this.index | 0)) {
      this.sprite.texture = this.animation[index | 0];
    }
    this.index = index;
  }

  collidesWith(other: CollisionMask, dx: number, dy: number) {
    return dy / 6 + other.height > this.level;
  }

  rise(amount: number) {
    this.newLevel -= amount;
  }
}
