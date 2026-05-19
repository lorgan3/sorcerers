import { Container } from "pixi.js";
import { Body } from "../collision/body";
import {
  EntityType,
  HurtableEntity,
  Item,
  Layer,
  Priority,
  Syncable,
} from "./types";

import { circle9x9 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";
import { Character } from "./character";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getLevel, getServer } from "../context";

// Item body's terminal velocity; gravity alone can't trip the explosion.
const ITEM_EXPLOSION_SPEED_THRESHOLD = 10;
const ITEM_EXPLOSION_RANGE = 12;
const ITEM_EXPLOSION_POWER = 1;
const ITEM_EXPLOSION_DAMAGE = 1;

export abstract class BaseItem extends Container implements Syncable, Item {
  protected static floatSpeed = 0.3;
  protected static floatDuration = 90;
  protected static appearDuration = 30;

  public layer = Layer.Background;

  public readonly body: Body;
  public id = -1;
  public readonly priority = Priority.Low;
  public hp = 1;

  protected time = 0;
  protected lastActiveTime = 0;
  protected activateTime = -1;

  constructor(x: number, y: number, protected _appeared = false) {
    super();

    this.body = new Body(getLevel().terrain.characterMask, {
      mask: circle9x9,
      gravity: 0.1,
      airXFriction: 0.99,
      roundness: 0.25,
      ladderSpeed: 0,
      onCollide: (x, y) => this.handleHighSpeedCollide(x, y),
    });
    this.body.move(x, y);
    this.position.set(x * 6, y * 6);

    this.alpha = 0;
  }

  protected handleHighSpeedCollide(x: number, y: number) {
    if (this.body.velocity < ITEM_EXPLOSION_SPEED_THRESHOLD) {
      return;
    }
    const server = getServer();
    if (!server) {
      return;
    }
    server.damage(
      new ExplosiveDamage(
        x,
        y,
        ITEM_EXPLOSION_RANGE,
        ITEM_EXPLOSION_POWER,
        ITEM_EXPLOSION_DAMAGE,
      ),
    );
  }

  abstract serialize(): void;
  abstract deserialize(data: any): void;
  abstract type: EntityType;
  abstract serializeCreate(): void;

  damage(
    source: DamageSource,
    damage: number,
    force?: Force | undefined
  ): void {
    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  getCenter(): [number, number] {
    return [this.position.x + 27, this.position.y + 27];
  }

  tick(dt: number) {
    if (!this._appeared) {
      return;
    }

    this.time += dt;

    if (this.time <= BaseItem.appearDuration) {
      this.alpha = this.time / BaseItem.appearDuration;
      return;
    }

    if (this.activateTime >= 0) {
      const activeTime = this.time - this.activateTime;

      if (activeTime > BaseItem.floatDuration) {
        this.visible = false;

        const server = getServer();
        if (server && server.isEnding()) {
          server.kill(this);
        }

        return;
      }

      this.position.y -= BaseItem.floatSpeed * dt;
      this.alpha = 1 - activeTime / BaseItem.floatDuration;

      return;
    }

    if (this.time - this.lastActiveTime > 15) {
      this.body.active = 1;
    }

    if (this.body.active) {
      this.lastActiveTime = this.time;

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);
      }
    }

    // Runs while the body sleeps too, so a settled item doesn't make pickups laggy.
    const server = getServer();
    if (server) {
      getLevel().withNearbyEntities(
        ...this.getCenter(),
        48,
        (entity: HurtableEntity) => {
          if (!(entity instanceof Character)) {
            return;
          }

          if (!this.canActivate()) {
            return true;
          }

          server.activate(this, entity);
          return true;
        }
      );

      if (
        getLevel().terrain.killbox.collidesWith(
          this.body.mask,
          this.position.x,
          this.position.y
        )
      ) {
        server.kill(this);
      }
    }
  }

  die() {
    getLevel().remove(this);
  }

  activate(character?: Character) {
    this.activateTime = this.time;

    if (character) {
      character.player.stats.registerItem(this);
    }
  }

  canActivate() {
    return true;
  }

  get activated() {
    return this.activateTime > -1;
  }

  appear() {
    this._appeared = true;
    ControllableSound.fromEntity(this, Sound.Pop);
  }

  get appeared() {
    return this.time >= BaseItem.appearDuration;
  }
}
