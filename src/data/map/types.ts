import { DisplayObject } from "pixi.js";

export interface TickingEntity extends DisplayObject {
  tick(dt: number): void;
}

export interface HurtableEntity extends TickingEntity {
  hp: number;
  hurt: boolean;
  getCenter(): [number, number];
}
