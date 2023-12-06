export interface DamageSource {
  readonly x: number;
  readonly y: number;

  damage(): void;
  serialize(): any;
}

export enum DamageSourceType {
  Explosive,
}
