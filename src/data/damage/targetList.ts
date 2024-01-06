import { HurtableEntity } from "../entity/types";
import { Level } from "../map/level";

export interface Force {
  direction: number;
  power: number;
}

export interface Target {
  entityId: number;
  damage: number;
  force?: Force;
}

export class TargetList {
  constructor(private targets: Target[] = []) {}

  add(entity: HurtableEntity, damage: number, force?: Force) {
    this.targets.push({
      entityId: entity.id,
      damage,
      force,
    });

    return this;
  }

  damage() {
    for (let target of this.targets) {
      (Level.instance.entityMap.get(target.entityId) as HurtableEntity).damage(
        target.damage,
        target.force
      );
    }
  }

  serialize() {
    return this.targets.map((target) =>
      target.force && target.force.power !== 0
        ? [
            target.entityId,
            target.damage,
            target.force.power,
            target.force.direction,
          ]
        : [target.entityId, target.damage]
    );
  }

  static deserialize(data?: ReturnType<TargetList["serialize"]>) {
    if (!data) {
      return new TargetList();
    }

    return new TargetList(
      data.map((target) =>
        target[2]
          ? {
              entityId: target[0],
              damage: target[1],
              force: { power: target[2], direction: target[3] },
            }
          : { entityId: target[0], damage: target[1] }
      )
    );
  }
}
