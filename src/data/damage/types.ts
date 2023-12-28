export interface DamageSource {
  readonly x: number;
  readonly y: number;
  readonly type: DamageSourceType;

  damage(): void;
  serialize(): any;
}

export enum DamageSourceType {
  Generic,
  Explosive,
  Falling,
}
