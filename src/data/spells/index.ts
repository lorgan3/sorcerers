import { DisplayObject } from "pixi.js";
import { Range } from "./range";
import { Fireball } from "./fireball";
import { Controller } from "../controller/controller";
import { Character } from "../entity/character";
import { Sword } from "./sword";
import { ArrowDown } from "./downArrow";
import { PhysicsBody } from "../collision";
import { Lock, Target } from "./lock";
import { Telekinesis } from "./telekinesis";
import { Melee } from "./melee";
import { Shield } from "./shield";

export interface Cursor extends DisplayObject {
  update(controller: Controller): void;
  remove(): void;
}

export interface Projectile extends DisplayObject {
  body?: PhysicsBody;

  tick(dt: number): void;
  serialize(): any;
  deserialize(data: any): void;
}

export interface Spell {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell) => Cursor;
  data: any;
}

export const SPELLS: Spell[] = [
  {
    name: "Melee",
    description: "For less gifted sorcerers",
    cursor: Range,
    data: {
      projectile: Melee,
      xOffset: 18,
      yOffset: 20,
      x: 0,
      y: 1,
    },
  },
  {
    name: "Fireball",
    description: "Generic fireball",
    cursor: Range,
    data: {
      projectile: Fireball,
      xOffset: 7,
      yOffset: 10.5,
      x: 3,
      y: 6.5,
    },
  },
  {
    name: "Arthur's sword",
    description: "Giant sword from the sky",
    cursor: ArrowDown,
    data: {
      projectile: Sword,
      xOffset: -5.5,
      yOffset: 0,
    },
  },
  {
    name: "Telekinesis",
    description: "Move from a distance",
    cursor: Lock,
    data: {
      target: Target.Character,
      projectile: Telekinesis,
    },
  },
  {
    name: "Shield",
    description: "Contingency plan",
    cursor: Range,
    data: {
      projectile: Shield,
      xOffset: 16,
      yOffset: 16,
      x: -8,
      y: -3,
    },
  },
];
