import { DisplayObject } from "pixi.js";
import { PhysicsBody } from "../collision";
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";
import { Character } from "./character";

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

  getCenter(): [number, number];
  serializeCreate(): any;
  die?(): void;
}

export interface HurtableEntity extends Spawnable {
  body: PhysicsBody;
  hp: number;

  damage(source: DamageSource, damage: number, force?: Force): void;
  die(): void;
}

export interface Syncable<T = any> extends Spawnable {
  readonly priority: Priority;

  serialize(): T;
  deserialize(data: T): void;
}

export interface Item extends Spawnable, HurtableEntity {
  appear(): void;
  activate(character?: Character): void;
  die(): void;
}

export function isHurtableEntity(entity: {}): entity is HurtableEntity {
  return "getCenter" in entity;
}

export function isSpawnableEntity(entity: TickingEntity): entity is Spawnable {
  return "serializeCreate" in entity && !(entity instanceof Character);
}

export function isSyncableEntity(entity: TickingEntity): entity is Syncable {
  return "priority" in entity;
}

export function isItem(entity: TickingEntity): entity is Item {
  return "activate" in entity;
}

export enum EntityType {
  Shield,
  Zoltraak,
  Fireball,
  Character,
  MagicScroll,
  Potion,
  Catastravia,
  CatastraviaMissile,
  MagicMissile,
  GateOfBabylon,
  SmallSword,
  Reelseiden,
  Nephtear,
  Hairpin,
  Bomb,
  IceWallSpawner,
  IceWall,
  Rock,
  Meteor,
  Excalibur,
  Bakuretsu,
  WindBlast,
  FireWheel,
  ChainLightning,
  Acid,
  Teleport,
  Doragate,
}

export enum Priority {
  Low,
  High,
  Dynamic,
}
