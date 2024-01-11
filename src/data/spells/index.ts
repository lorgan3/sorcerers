import { DisplayObject } from "pixi.js";
import { Range } from "../../grapics/cursor/range";
import { Fireball } from "./fireball";
import { Key } from "../controller/controller";
import { Character } from "../entity/character";
import { Sword } from "./sword";
import { ArrowDown } from "../../grapics/cursor/downArrow";
import { PhysicsBody } from "../collision";
import { Lock, Target } from "../../grapics/cursor/lock";
import { Telekinesis } from "../../grapics/cursor/telekinesis";
import { Melee } from "./melee";
import { Shield } from "./shield";
import { Bakuretsu } from "./bakuretsu";
import { ArcaneCircle } from "../../grapics/cursor/magicCircle";
import { Zoltraak } from "./zoltraak";
import { ApplyCursor } from "../../grapics/cursor/applyCursor";
import { Cursor } from "../../grapics/cursor/types";

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
  {
    name: "Bakuretsu",
    description: "Ekusuuu ploooooooosion",
    cursor: ArrowDown,
    data: {
      projectile: Bakuretsu,
      xOffset: 0,
      yOffset: 0,
    },
  },
  {
    name: "Zoltraak",
    description: "Magical death laser",
    cursor: ArcaneCircle,
    data: {
      projectile: Zoltraak,
      xOffset: 2,
      yOffset: 2,
      x: 27 / 6,
      y: 8,
    },
  },
  {
    name: "Wings",
    cursor: ApplyCursor,
    data: {
      applyKeys: [Key.Up, Key.W],
      apply: (character: Character) => character.giveWings(),
    },
  },
];
