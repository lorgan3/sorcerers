import { TargetList } from "./targetList";

export interface DamageSource {
  readonly x?: number;
  readonly y?: number;
  readonly type: DamageSourceType;

  damage(): void;
  serialize(): any;
  getTargets(): TargetList;
}

export enum DamageSourceType {
  Generic,
  Explosive,
  Falling,
  Impact,
}
