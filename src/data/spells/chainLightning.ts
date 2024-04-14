import { Container } from "pixi.js";
import { Level } from "../map/level";

import { Character } from "../entity/character";

import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import {
  EntityType,
  HurtableEntity,
  Spawnable,
  isHurtableEntity,
} from "../entity/types";
import { Server } from "../network/server";

import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Lightning } from "../../graphics/lightning";
import { angleDiff, getAngle, getDistance } from "../../util/math";
import { GenericDamage } from "../damage/genericDamage";
import { TargetList } from "../damage/targetList";
import { Element } from "./types";

type Target = [number, number] | HurtableEntity;

export class ChainLightning extends Container implements Spawnable {
  private static chargeTime = 15;
  private static maxRange = 200;
  private static maxAngle = Math.PI / 4;
  private static maxChains = 5;

  private time = 0;
  private nextDischarge = 0;
  private index = 0;

  public id = -1;
  public readonly type = EntityType.ChainLightning;

  constructor(x: number, y: number, private targets: Target[]) {
    super();

    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Electricity);
  }

  die() {
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  private getTargetCoords(index: number) {
    const target = this.targets[index];

    return "getCenter" in target ? target.getCenter() : target;
  }

  tick(dt: number) {
    this.time += dt;

    if (this.time >= this.nextDischarge) {
      this.nextDischarge += ChainLightning.chargeTime;

      const [x, y] =
        this.index === 0
          ? [this.position.x, this.position.y]
          : this.getTargetCoords(this.index - 1);

      const coords = this.getTargetCoords(this.index);

      const distance = getDistance(x, y, ...coords);
      const direction = getAngle(x, y, ...coords);

      Level.instance.add(new Lightning(x, y, distance, direction));

      const target = this.targets[this.index];
      if (isHurtableEntity(target)) {
        Level.instance.damage(
          new GenericDamage(
            new TargetList().add(
              target,
              12 + Manager.instance.getElementValue(Element.Arcane) * 2
            )
          )
        );
      }

      this.index++;
      if (this.index >= this.targets.length) {
        this.die();
      }
    }
  }

  serializeCreate() {
    return [
      this.position.x / 6,
      this.position.y / 6,
      this.targets.map((target) =>
        isHurtableEntity(target) ? target.id : target
      ),
    ] as const;
  }

  static create(data: ReturnType<ChainLightning["serializeCreate"]>) {
    return new ChainLightning(
      data[0],
      data[1],
      data[2].map((data) =>
        typeof data === "number"
          ? (Level.instance.entityMap.get(data) as HurtableEntity)
          : data
      )
    );
  }

  static cast(x: number, y: number, character: Character, direction: number) {
    if (!Server.instance) {
      return;
    }

    const targets: Target[] = [];

    let checkX = x * 6;
    let checkY = y * 6;

    for (let i = 0; i < ChainLightning.maxChains; i++) {
      const nextTargets: Array<[number, HurtableEntity]> = [];
      Level.instance.withNearbyEntities(
        checkX,
        checkY,
        ChainLightning.maxRange,
        (entity, distance) => {
          if (
            entity !== character &&
            !targets.includes(entity) &&
            (i > 0 ||
              Math.abs(
                angleDiff(
                  direction,
                  getAngle(checkX, checkY, ...entity.getCenter())
                )
              ) < ChainLightning.maxAngle)
          ) {
            nextTargets.push([distance, entity]);
          }
        }
      );
      const nextTarget = nextTargets.sort((a, b) => b[0] - a[0])[0];

      if (!nextTarget) {
        break;
      }

      [checkX, checkY] = nextTarget[1].getCenter();
      targets.push(nextTarget[1]);
    }

    if (targets.length === 0) {
      targets.push([
        checkX + Math.cos(direction) * ChainLightning.maxRange,
        checkY + Math.sin(direction) * ChainLightning.maxRange,
      ]);
    }

    const entity = new ChainLightning(x, y, targets);

    Server.instance.create(entity);
    return entity;
  }
}
