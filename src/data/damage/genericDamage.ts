import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";

export class GenericDamage implements DamageSource {
  public readonly x = 0;
  public readonly y = 0;
  public readonly type = DamageSourceType.Generic;

  constructor(public targets: TargetList) {}

  damage() {
    this.targets.damage();
  }

  serialize() {
    return this.targets.serialize();
  }

  getTargets() {
    return this.targets;
  }

  static deserialize(data: ReturnType<GenericDamage["serialize"]>) {
    return new GenericDamage(TargetList.deserialize(data));
  }
}
