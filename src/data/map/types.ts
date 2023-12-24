import { DisplayObject } from "pixi.js";

export interface TickingEntity extends DisplayObject {
  tick(dt: number): void;
}

export interface HurtableEntity extends DisplayObject {
  hp: number;
  getCenter(): [number, number];
}
