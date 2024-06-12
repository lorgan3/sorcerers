import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { circle16x16 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { Explosion } from "../../graphics/explosion";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, Layer, Priority, Syncable } from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";

import { StickyBody } from "../collision/stickyBody";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class FireWheel extends Container implements Syncable {
  private static baseLifeTime = 450;

  public readonly body: StickyBody;
  private sprite: AnimatedSprite;
  private lifetime = 0;
  private sound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.FireWheel;
  public readonly priority = Priority.High;
  public layer = Layer.Background;

  constructor(x: number, y: number, speed: number, private direction: number) {
    super();

    this.lifetime =
      FireWheel.baseLifeTime *
      (0.5 + 0.5 * Manager.instance.getElementValue(Element.Arcane));

    this.body = new StickyBody(Level.instance.terrain.collisionMask, {
      mask: circle16x16,
      velocity: 2,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.Fire);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_wheel"]);
    this.sprite.animationSpeed = 0.1;
    this.sprite.scale.set(3);
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(3);

    // const canvas = new OffscreenCanvas(1, 1);
    // const ctx = canvas.getContext("2d")!;

    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, 1, 1);

    // const sprite = new Sprite(Texture.from(canvas));
    // sprite.scale.set(6);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(circle16x16Canvas.data, 16, 16)
    // );
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;
    // sprite2.position.set(-48);

    this.addChild(this.sprite);

    // When spawning in a wall
    if (
      Server.instance &&
      Level.instance.terrain.collisionMask.collidesWithPoint(
        ...this.body.position
      )
    ) {
      this._die(x, y);
    }
  }

  private _die(x: number, y: number) {
    Server.instance.damage(
      new ExplosiveDamage(
        x,
        y,
        16,
        3,
        2 + Manager.instance.getElementValue(Element.Elemental)
      )
    );
    Server.instance.kill(this);
  }

  die() {
    Level.instance.remove(this);
    new Explosion(this.position.x, this.position.y);
    Manager.instance.setTurnState(TurnState.Ending);
    this.sound?.destroy();
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    this.body.tick(dt);
    this.sprite.scale.x = this.body.direction * 3;
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    if (this.body.sticky) {
      if (this.sound?.alias !== Sound.Burn) {
        this.sound?.destroy();
        this.sound = undefined;
      }

      if (!this.sound) {
        this.sound = ControllableSound.fromEntity(this, Sound.Burn, {
          loop: true,
        });
      } else {
        this.sound.update(this);
      }
    }

    if (!Server.instance) {
      return;
    }

    this.lifetime -= dt;
    if (
      this.lifetime <= 0 ||
      Level.instance.terrain.killbox.collidesWith(
        this.body.mask,
        this.position.x - 48,
        this.position.y - 48
      )
    ) {
      this._die(x, y);
      return;
    }

    Level.instance.withNearbyEntities(
      this.position.x,
      this.position.y,
      10 * 6,
      (entity) => {
        if (entity instanceof Character) {
          this._die(x, y);
          return true;
        }
      }
    );
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<FireWheel["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.direction,
    ] as const;
  }

  static create(data: ReturnType<FireWheel["serializeCreate"]>) {
    return new FireWheel(...data);
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    if (!Server.instance) {
      return;
    }

    const entity = new FireWheel(x, y, power * 1.5, direction);

    Server.instance.create(entity);
    Server.instance.focus(entity);
    return entity;
  }
}
