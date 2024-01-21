import { Range } from "../../grapics/cursor/range";
import { Fireball } from "./fireball";
import { Key } from "../controller/controller";
import { Character } from "../entity/character";
import { Sword } from "./sword";
import { ArrowDown } from "../../grapics/cursor/downArrow";
import { Lock, Target } from "../../grapics/cursor/lock";
import { Telekinesis } from "../../grapics/cursor/telekinesis";
import { Shield } from "./shield";
import { Bakuretsu } from "./bakuretsu";
import { ArcaneCircle } from "../../grapics/cursor/magicCircle";
import { Zoltraak } from "./zoltraak";
import { ApplyCursor } from "../../grapics/cursor/applyCursor";
import { Cursor } from "../../grapics/cursor/types";
import { TurnState } from "../network/types";

export interface Spell<C extends Cursor = any> {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell<C>) => C;
  data: Parameters<C["trigger"]>[0];
}

function spell<C extends Cursor>(
  cursor: new (character: Character, spell: Spell<any>) => C,
  config: Omit<Spell<C>, "cursor">
) {
  return { ...config, cursor };
}

spell(ApplyCursor, {
  name: "Melee",
  description: "For less gifted sorcerers",
  data: {
    applyKeys: [Key.M1],
    apply: (character: Character) => character.melee(),
    turnState: TurnState.Ending,
  },
});

const MELEE = spell(ApplyCursor, {
  name: "Melee",
  description: "For less gifted sorcerers",
  data: {
    applyKeys: [Key.M1],
    apply: (character: Character) => character.melee(),
    turnState: TurnState.Ending,
  },
});

const FIREBALL = spell(Range, {
  name: "Fireball",
  description: "Generic fireball",
  data: {
    projectile: Fireball,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const ARTHUR_SWORD = spell(ArrowDown, {
  name: "Arthur's sword",
  description: "Giant sword from the sky",
  data: {
    projectile: Sword,
    xOffset: -5.5,
    yOffset: 0,
    turnState: TurnState.Attacked,
    spellSource: true,
  },
});

const TELEKINESIS = spell(Lock, {
  name: "Telekinesis",
  description: "Move from a distance",
  data: {
    target: Target.Character,
    projectile: Telekinesis,
    turnState: TurnState.Ongoing,
  },
});

const SHIELD = spell(Range, {
  name: "Shield",
  description: "Contingency plan",
  data: {
    projectile: Shield,
    xOffset: 10,
    yOffset: 14,
    x: -8,
    y: -3,
    turnState: TurnState.Ending,
  },
});

const BAKURETSU = spell(ArrowDown, {
  name: "Bakuretsu",
  description: "Ekusuuu ploooooooosion",
  data: {
    projectile: Bakuretsu,
    xOffset: 0,
    yOffset: 0,
    turnState: TurnState.Attacked,
  },
});

const ZOLTRAAK = spell(ArcaneCircle, {
  name: "Zoltraak",
  description: "Magical death laser",
  data: {
    projectile: Zoltraak,
    xOffset: 2,
    yOffset: 2,
    x: 3,
    y: 8,
    turnState: TurnState.Ending,
  },
});

const WINGS = spell(ApplyCursor, {
  name: "Wings",
  data: {
    applyKeys: [Key.Up, Key.W],
    apply: (character: Character) => character.giveWings(),
  },
});

export const SPELLS: Spell[] = [
  MELEE,
  FIREBALL,
  ARTHUR_SWORD,
  TELEKINESIS,
  SHIELD,
  BAKURETSU,
  ZOLTRAAK,
  WINGS,
];
