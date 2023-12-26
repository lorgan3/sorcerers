import { Container } from "pixi.js";
import { Range } from "./range";
import { Fireball } from "./fireball";
import { Controller } from "../controller/controller";
import { Character } from "../character";

export interface Cursor extends Container {
  update(controller: Controller): void;
  remove(): void;
}

export interface Spell {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell) => Cursor;
  data: any;
}

export const SPELLS: Spell[] = [
  {
    name: "Fireball",
    description: "Generic fireball",
    cursor: Range,
    data: {
      projectile: Fireball,
    },
  },
];
