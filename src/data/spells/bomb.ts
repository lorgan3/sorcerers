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
  private static fuseTime = 45;
  private static primeTime = 60;
  private static triggerRange = 96;
  private static minSyncInterval = 6;

  public readonly body: Body;
  private sprite: AnimatedSprite;
  private time = 0;
  private lastActiveTime = 0;
  private activateTime = -1;
  private power = 1;
  private fuse = 0;
  private lastSync = 0;
  private lastX = 0;
  private lastY = 0;

  public hp = 1;
  public id = -1;
  public readonly type = EntityType.Bomb;
  public readonly priority = Priority.Dynamic;

  constructor(
    x: number,
    y: number,
    speed: number,
    direction: number,
    private character: Character
  ) {
    super();
    this.power = Manager.instance.getElementValue(Element.Elemental);
    this.fuse = Bomb.fuseTime * (0.5 + Math.random());

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: this.onCollide,
      gravity: 0.1,
      airXFriction: 0.99,
      groundFriction: 0.8,
      roundness: 0.2,
      bounciness: -0.1,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Launch);

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
    if (Server.instance && this.activateTime === -1) {
      Server.instance.activate(this);
    }

    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  private onCollide = (x: number, y: number) => {
    if (this.body.velocity > 0.5) {
      ControllableSound.fromEntity(this, Sound.Land);
    }
  };

  private _die(x: number, y: number) {
    if (this.hp <= 0 || !Server.instance) {
      return;
    }

    this.hp = 0;
    Server.instance?.damage(
      new ExplosiveDamage(x, y, 16, 2, 5 * (0.7 + this.power * 0.3))
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
      Level.instance.terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.position
      );

      this.body.tick(dt);

      Level.instance.terrain.characterMask.add(
        this.body.mask,
        ...this.body.position
      );

      const [x, y] = this.body.precisePosition;
      this.position.set(x * 6, y * 6);

      if (!Server.instance) {
        return;
      }

      if (this.time >= this.lastSync + Bomb.minSyncInterval) {
        const [x, y] = this.body.position;
        if (x !== this.lastX || y !== this.lastY) {
          Server.instance.dynamicUpdate(this);
          this.lastX = x;
          this.lastY = y;
          this.lastSync = this.time;
        }
      }

      if (this.time > Bomb.primeTime) {
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

  move(x: number, y: number) {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.body.move(x, y);

    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<Bomb["serialize"]>) {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.body.deserialize(data);

    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<Bomb["serializeCreate"]>) {
    return new Bomb(
      data[0],
      data[1],
      data[2],
      data[3],
      Level.instance.entityMap.get(data[4]) as Character
    );
  }
}
