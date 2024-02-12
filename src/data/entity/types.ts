import { DisplayObject } from "pixi.js";
import { PhysicsBody } from "../collision";
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";

export enum Layer {
  Background,
  Default,
}

export interface TickingEntity extends DisplayObject {
  tick(dt: number): void;

  layer?: Layer;
}

export interface Spawnable extends TickingEntity {
  readonly type: EntityType;
  id: number;

  serializeCreate(): any;
  die?(): void;
}

export interface HurtableEntity extends Spawnable {
  body: PhysicsBody;
  hp: number;

  damage(source: DamageSource, damage: number, force?: Force): void;
  die(): void;
  getCenter(): [number, number];
}

export interface Syncable<T = any> extends Spawnable {
  readonly priority: Priority;

  serialize(): T;
  deserialize(data: T): void;
}

export interface Item extends Spawnable {
  activate(): void;
}

export function isHurtableEntity(
  entity: TickingEntity
): entity is HurtableEntity {
  return "getCenter" in entity;
}

export function isSpawnableEntity(entity: TickingEntity): entity is Spawnable {
  return "serializeCreate" in entity;
}

export function isSyncableEntity(entity: TickingEntity): entity is Syncable {
  return "priority" in entity;
}

export enum EntityType {
  Shield,
  Zoltraak,
  Fireball,
  Character,
  MagicScroll,
}

export enum Priority {
  Low,
  High, // Not used
  Dynamic,
}
