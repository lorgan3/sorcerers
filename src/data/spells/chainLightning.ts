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
import { Shield } from "./shield";

type Target = [number, number] | HurtableEntity;

export class ChainLightning extends Container implements Spawnable {
  private static chargeTime = 15;
  private static maxRange = 260;
  private static defaultRange = 200;
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
        Server.instance?.damage(
          new GenericDamage(
            new TargetList().add(
              target,
              20 + Manager.instance.getElementValue(Element.Elemental) * 5
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
          if (entity === character || targets.includes(entity)) {
            return;
          }

          if (i > 0) {
            nextTargets.push([distance, entity]);
            return;
          }

          const angle = Math.abs(
            angleDiff(
              direction,
              getAngle(checkX, checkY, ...entity.getCenter())
            )
          );

          if (angle < ChainLightning.maxAngle) {
            nextTargets.push([angle, entity]);
          }
        }
      );

      const nextTarget = nextTargets.sort((a, b) => a[0] - b[0])[0];
      if (!nextTarget) {
        break;
      }

      [checkX, checkY] = nextTarget[1].getCenter();
      targets.push(nextTarget[1]);

      if (nextTarget[1] instanceof Shield) {
        break;
      }
    }

    if (targets.length === 0) {
      targets.push([
        checkX + Math.cos(direction) * ChainLightning.defaultRange,
        checkY + Math.sin(direction) * ChainLightning.defaultRange,
      ]);
    }

    const entity = new ChainLightning(x, y, targets);

    Server.instance.create(entity);
    return entity;
  }
}
