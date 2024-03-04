import { Fireball } from "./fireball";
import { Key } from "../controller/controller";
import { Character } from "../entity/character";
import { Sword } from "./sword";
import { ArrowDown } from "../../graphics/cursor/downArrow";
import { Lock, Target } from "../../graphics/cursor/lock";
import { Telekinesis } from "../../graphics/cursor/telekinesis";
import { Shield } from "./shield";
import { Bakuretsu } from "./bakuretsu";
import { ArcaneCircle } from "../../graphics/cursor/magicCircle";
import { Zoltraak } from "./zoltraak";
import { ApplyCursor } from "../../graphics/cursor/applyCursor";
import { Cursor } from "../../graphics/cursor/types";
import { TurnState } from "../network/types";
import { Element } from "./types";
import { PoweredArcaneCircle } from "../../graphics/cursor/poweredArcaneCircle";
import { Manager } from "../network/manager";
import { Catastravia } from "./catastravia";
import { MagicMissile } from "./magicMissile";
import { getAngle } from "../../util/math";
import { GateOfBabylon } from "./gateOfBabylon";

export interface Spell<C extends Cursor = any> {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell<C>) => C;
  data: Parameters<C["trigger"]>[0];
  elements: Element[];
  cost: number;
  costMultiplier?: () => number;
}

function spell<C extends Cursor>(
  cursor: new (character: Character, spell: Spell<any>) => C,
  config: Omit<Spell<C>, "cursor">
) {
  return { ...config, cursor };
}

export const getSpellCost = (spell: Spell) =>
  spell.cost * (spell.costMultiplier?.() || 1);

const MELEE = spell(ApplyCursor, {
  name: "Melee",
  description: "For less gifted sorcerers",
  elements: [Element.Physical],
  cost: 5,
  data: {
    applyKeys: [Key.M1],
    apply: (character: Character) => character.melee(),
    turnState: TurnState.Ending,
  },
});

const FIREBALL = spell(PoweredArcaneCircle, {
  name: "Fireball",
  description: "Generic fireball",
  elements: [Element.Elemental],
  cost: 10,
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
  elements: [Element.Physical, Element.Arcane],
  cost: 30,
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
  elements: [Element.Arcane],
  cost: 40,
  data: {
    target: Target.Character,
    projectile: Telekinesis,
    turnState: TurnState.Ongoing,
  },
});

const SHIELD = spell(ArcaneCircle, {
  name: "Shield",
  description: "Contingency plan",
  elements: [Element.Physical, Element.Life],
  cost: 10,
  costMultiplier: () =>
    1.4 - Manager.instance.getElementValue(Element.Life) * 0.4,
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
  elements: [Element.Elemental, Element.Arcane],
  cost: 40,
  costMultiplier: () =>
    1.4 - Manager.instance.getElementValue(Element.Arcane) * 0.4,
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
  elements: [Element.Arcane],
  cost: 20,
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
  elements: [Element.Life],
  cost: 20,
  costMultiplier: () =>
    1.4 - Manager.instance.getElementValue(Element.Life) * 0.4,
  data: {
    applyKeys: [Key.Up, Key.W],
    apply: (character: Character) => character.giveWings(),
  },
});

const CATASTRAVIA = spell(PoweredArcaneCircle, {
  name: "Catastravia",
  description: "Holy missile volley",
  elements: [Element.Life, Element.Arcane],
  cost: 30,
  data: {
    projectile: Catastravia,
    xOffset: 2,
    yOffset: 2,
    x: 3,
    y: 8,
    turnState: TurnState.Attacked,
  },
});

const MAGIC_MISSILE = spell(ApplyCursor, {
  name: "Magic missile",
  description: "",
  elements: [Element.Life],
  cost: 30,
  data: {
    applyKeys: [Key.M1],
    turnState: TurnState.Attacked,
    apply: (character) => {
      const [cx, cy] = character.body.precisePosition;
      const rotation = getAngle(
        cx * 6,
        cy * 6,
        ...character.player.controller.getMouse()
      );

      MagicMissile.cast(
        cx + 3 + Math.cos(rotation) * 7,
        cy + 6.5 + Math.sin(rotation) * 10.5,
        character,
        rotation
      );
    },
  },
});

const BABYLON = spell(ArrowDown, {
  name: "Gates of babylon",
  elements: [Element.Physical],
  cost: 30,
  data: {
    projectile: GateOfBabylon,
    xOffset: -0.5,
    yOffset: 0,
    turnState: TurnState.Attacked,
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
  CATASTRAVIA,
  MAGIC_MISSILE,
  BABYLON,
];
