import { Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../../collision/collisionMask";
import { SimpleBody } from "../../collision/simpleBody";
import { Level } from "../../map/level";
import { TickingEntity } from "../types";

export interface GibConfig {
  texture: Texture;
  offsetX: number;
  offsetY: number;
  mask: CollisionMask;
  maskSprite?: Sprite;
}

const LIFETIME = 80;

export class Gib extends Sprite implements TickingEntity {
  public readonly body: SimpleBody;
  private time = LIFETIME;

  constructor({ texture, offsetX, offsetY, mask, maskSprite }: GibConfig) {
    super(texture);

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask,
      bounciness: -0.7,
      gravity: 0.25,
      friction: 0.96,
    });
    this.scale.set(2);
    this.position.set(offsetX, offsetY);

    if (maskSprite) {
      maskSprite.position.set(-offsetX, -offsetY);

      this.addChild(maskSprite);
    }
  }

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    this.time -= dt;
    if (this.time <= 0) {
      Level.instance.remove(this);
    }
  }
}
