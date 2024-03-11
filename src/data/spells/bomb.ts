import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Explosion } from "../../graphics/explosion";
import { Manager } from "../network/manager";
import { EntityType, HurtableEntity, Item, Priority } from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";
import { Body } from "../collision/body";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Character } from "../entity/character";
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";

export class Bomb extends Container implements Item {
  private static fuseTime = 60;
  private static primeTime = 60;
  private static triggerRange = 96;

  public readonly body: Body;
  private sprite: AnimatedSprite;
  private time = 0;
  private lastActiveTime = 0;
  private activateTime = -1;
  private arcanePower = 1;
  private fuse = 0;

  public hp = 1;
  public id = -1;
  public readonly type = EntityType.Bomb;
  public readonly priority = Priority.Dynamic;

  constructor(x: number, y: number, speed: number, direction: number) {
    super();
    this.arcanePower = Manager.instance.getElementValue(Element.Arcane);
    this.fuse = Bomb.fuseTime * (0.5 + Math.random());
    ControllableSound.fromEntity([x * 6, y * 6], Sound.Launch);

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: this.onCollide,
      gravity: 0.1,
      airFriction: 0.99,
      groundFriction: 0.8,
      roundness: 0.2,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_smallBomb"]);
    this.sprite.position.set(9, 9);
    this.sprite.scale.set(3);
    this.sprite.animationSpeed = 0.02;
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    // const sprite2 = new Sprite(Texture.fromBuffer(circle3x3Canvas.data, 3, 3));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);
  }

  appear(): void {
    // Bombs are visible right away
  }

  activate(): void {
    this.activateTime = this.time;
    this.sprite.animationSpeed = 0.15;
    ControllableSound.fromEntity(this, Sound.Beep);

    if (Server.instance) {
      Server.instance.dynamicUpdate(this);
    }
  }

  damage(
    source: DamageSource,
    damage: number,
    force?: Force | undefined
  ): void {
    this._die(...this.body.precisePosition);
  }

  private onCollide = (x: number, y: number) => {
    if (Server.instance) {
      Server.instance.dynamicUpdate(this);
    }

    ControllableSound.fromEntity(
      [this.position.x, this.position.y],
      Sound.Land
    );
  };

  private _die(x: number, y: number) {
    if (this.hp <= 0 || !Server.instance) {
      return;
    }

    this.hp = 0;
    Level.instance.damage(
      new ExplosiveDamage(x, y, 16, 1, 1 + this.arcanePower)
    );
    Server.instance.kill(this);
  }

  die() {
    Level.instance.remove(this);
    new Explosion(this.position.x, this.position.y);
  }

  getCenter(): [number, number] {
    return [this.position.x + 9, this.position.y + 9];
  }

  tick(dt: number) {
    this.time += dt;
    if (this.time - this.lastActiveTime > 15) {
      this.body.active = 1;
      this.lastActiveTime = this.time;
    }

    if (this.body.active) {
      this.body.tick(dt);
      const [x, y] = this.body.precisePosition;
      this.position.set(x * 6, y * 6);

      if (Server.instance && this.time > Bomb.primeTime) {
        if (this.activateTime === -1) {
          Level.instance.withNearbyEntities(
            ...this.getCenter(),
            Bomb.triggerRange,
            (entity: HurtableEntity) => {
              if (!(entity instanceof Character)) {
                return;
              }

              Server.instance.activate(this, entity);
              return true;
            }
          );
        } else if (this.time - this.activateTime > this.fuse) {
          this._die(...this.body.precisePosition);
        }

        if (
          Level.instance.terrain.killbox.collidesWith(
            this.body.mask,
            this.position.x,
            this.position.y
          )
        ) {
          this._die(...this.body.precisePosition);
        }
      }
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<Bomb["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
    ] as const;
  }

  static create(data: ReturnType<Bomb["serializeCreate"]>) {
    return new Bomb(...data);
  }
}
