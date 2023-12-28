import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";

export class GenericDamage implements DamageSource {
  public readonly x = 0;
  public readonly y = 0;
  public readonly type = DamageSourceType.Generic;

  constructor(private targets: TargetList) {}

  damage() {
    this.targets.damage();
  }

  serialize() {
    return this.targets?.serialize();
  }

  static deserialize(data: ReturnType<GenericDamage["serialize"]>) {
    return new GenericDamage(TargetList.deserialize(data));
  }
}
