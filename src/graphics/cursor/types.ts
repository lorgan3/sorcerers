import { Controller } from "../../data/controller/controller";
import { TickingEntity } from "../../data/entity/types";

export interface Cursor<D = any, T = any> {
  tick(dt: number, controller: Controller): void;
  remove(): void;
  trigger(data: D): void;
  serialize(): T;
  deserialize(data: T): void;
}

export type ProjectileConstructor = {
  cast: (...data: any) => unknown;
};
