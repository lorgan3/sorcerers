import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";

export class GenericDamage implements DamageSource {
  public readonly type = DamageSourceType.Generic;

  constructor(public targets: TargetList) {}

  damage() {
    this.targets.damage(this);
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
