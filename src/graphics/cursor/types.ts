import { Controller } from "../../data/controller/controller";

export interface Cursor<TData = any, TTriggerState = any, TState = any> {
  tick(dt: number, controller: Controller): void;
  remove(): void;
  trigger(data: TData, state: TTriggerState): void;
  serialize(): TState;
  deserialize(data: TState): void;
}

export type ProjectileConstructor = {
  cast: (...data: any) => unknown;
};
