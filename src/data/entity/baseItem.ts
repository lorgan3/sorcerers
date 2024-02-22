import { Container } from "pixi.js";
import { Level } from "../map/level";
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
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";
import { Server } from "../network/server";
import { Character } from "./character";
import { Manager } from "../network/manager";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

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
  protected _appeared = false;

  constructor(x: number, y: number) {
    super();

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: circle9x9,
      gravity: 0.1,
      airFriction: 0.99,
      roundness: 0.6,
    });
    this.body.move(x, y);
    this.position.set(x * 6, y * 6);

    this.alpha = 0;
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

        if (Manager.instance.isEnding()) {
          this.die();
        }

        return;
      }

      this.position.y -= BaseItem.floatSpeed * dt;
      this.alpha = 1 - activeTime / BaseItem.floatDuration;

      return;
    }

    if (this.time - this.lastActiveTime > 30) {
      this.body.active = 1;
    }

    if (this.body.active) {
      this.lastActiveTime = this.time;

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);
      }

      if (Server.instance) {
        Level.instance.withNearbyEntities(
          ...this.getCenter(),
          48,
          (entity: HurtableEntity) => {
            if (!(entity instanceof Character)) {
              return;
            }

            Server.instance.activate(this, entity);
            return true;
          }
        );
      }
    }
  }

  die() {
    Level.instance.remove(this);
  }

  activate(_: Character) {
    this.activateTime = this.time;
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
