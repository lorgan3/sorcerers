import { Container, Sprite } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";

import { swordTip } from "../collision/precomputed/triangles";
import { FallDamage, Shape } from "../damage/fallDamage";
import { Projectile } from ".";

const SHAKE_INTENSITY = 8;

export class Sword extends Container implements Projectile {
  public readonly body: SimpleBody;
  private sprite!: Sprite;
  private bounces = 40;
  private lastY?: number;

  private shakeXOffset = 0;
  private shakeYOffset = 0;

  constructor(x: number, y: number) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: swordTip,
      onCollide: this.onCollide,
      bounciness: 0.7,
      friction: 0.95,
    });
    this.body.move(Math.round(x), y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new Sprite(atlas.textures["spells_sword.png"]);
    this.sprite.position.set(-55, 105);
    this.sprite.scale.y = -1;

    // const sprite2 = new Sprite(Texture.from(swordTipCanvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);
  }

  private onCollide = (x: number, y: number) => {
    if (this.lastY && Math.abs(this.lastY - y) < 1) {
      return;
    }

    this.bounces--;
    this.lastY = y;
    this.shakeXOffset = Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;
    this.shakeYOffset = Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;

    Level.instance.damage(new FallDamage(x, y - 4, Shape.SwordTip));

    if (this.bounces <= 0) {
      Level.instance.remove(this);
    }
  };

  tick(dt: number) {
    this.body.tick(dt);

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6 + this.shakeXOffset, y * 6 + this.shakeYOffset);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any) {
    this.body.deserialize(data);
  }
}
