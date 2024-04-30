import { Container, Sprite } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { TickingEntity } from "../entity/types";
import { Server } from "../network/server";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getRandom } from "../../util/array";
import { Manager } from "../network/manager";
import { Element } from "./types";

export class Pebble extends Container implements TickingEntity {
  private static riseTime = 40;
  private static hitBackOff = 3;
  private static collisionTime = 4;

  public readonly body: SimpleBody;
  private sprite: Sprite;

  private time = 0;
  private time2 = 0;
  private launched = false;
  private collided = false;
  private targetY: number;
  private floatIndex = Math.random() * 20;

  constructor(rx: number, private ry: number, private groundLevel: number) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: this.onCollide,
      bounciness: 1,
      friction: 0.98,
      gravity: 0.1,
    });
    this.body.move(rx, ry);
    this.position.set(rx * 6, groundLevel * 6);
    this.targetY = ry * 6;
    this.ry = groundLevel * 6;

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new Sprite(getRandom(atlas.animations["spells_pebble"]));
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(2);
    this.sprite.position.set(8);
    this.sprite.alpha = 0;
    this.sprite.rotation = Math.random() * Math.PI * 2;

    // const sprite2 = new Sprite(Texture.from(circle3x3Canvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);
  }

  private onCollide = (x: number, y: number) => {
    if (this.time < Pebble.hitBackOff) {
      return;
    }

    const damage = new ExplosiveDamage(
      x,
      y,
      4,
      1,
      1 + Manager.instance.getElementValue(Element.Arcane) * 0.5
    );
    Level.instance.damage(damage);

    if (damage.getTargets().hasEntities()) {
      Level.instance.remove(this);
    } else {
      this.collided = true;
    }
  };

  launch(power: number, direction: number) {
    this.time = 0;
    this.launched = true;
    this.body.addAngularVelocity(power, direction);

    ControllableSound.fromEntity(
      [this.position.x, this.position.y],
      Sound.Arrow
    );
  }

  tick(dt: number) {
    this.time += dt;

    if (!this.launched) {
      if (this.time > Pebble.riseTime) {
        this.floatIndex += dt;
        this.position.y = this.targetY + Math.sin(this.floatIndex / 20) * 20;
        this.sprite.alpha = 1;
      } else {
        this.position.y =
          this.ry +
          ((this.targetY - this.ry) * this.time) / Pebble.riseTime +
          Math.sin(this.floatIndex / 20) * 20;
        this.sprite.alpha = this.time / Pebble.riseTime;
      }
    } else {
      this.body.tick(dt);
      const [x, y] = this.body.precisePosition;
      this.position.set(x * 6, y * 6);

      if (this.collided) {
        this.time2 += dt;
        if (this.time2 > Pebble.collisionTime) {
          Level.instance.remove(this);
        }
      }
    }
  }
}
