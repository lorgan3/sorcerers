import { Controller } from "../../data/controller/controller";

export interface Cursor {
  tick(dt: number, controller: Controller): void;
  remove(): void;
}
