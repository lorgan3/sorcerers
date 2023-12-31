import { DisplayObject } from "pixi.js";
import { PhysicsBody } from "../collision";
import { Force } from "../damage/targetList";

export interface TickingEntity extends DisplayObject {
  id: number;

  tick(dt: number): void;
}

export interface HurtableEntity extends TickingEntity {
  body: PhysicsBody;
  hp: number;
  readonly type: EntityType;

  damage(damage: number, force?: Force): void;
  die(): void;
  getCenter(): [number, number];
  serializeCreate(): any;
}

export function isHurtableEntity(
  entity: TickingEntity
): entity is HurtableEntity {
  return "die" in entity;
}

export enum EntityType {
  Character,
  Shield,
}
