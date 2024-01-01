import { DisplayObject } from "pixi.js";
import { PhysicsBody } from "../collision";

export interface TickingEntity extends DisplayObject {
  id: number;

  tick(dt: number): void;
}

export interface HurtableEntity extends TickingEntity {
  body: PhysicsBody;
  hp: number;
  hurt: boolean;

  die(): void;
  getCenter(): [number, number];
}
