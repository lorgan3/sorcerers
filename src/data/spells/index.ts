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
import { Level } from "../map/level";
import { Blink } from "./blink";
import { Reelseiden } from "./reelseiden";
import { Nephtear } from "./nephtear";
import { WindBlast } from "./windBlast";
import { Hairpin } from "./hairpin";
import { IceWallSpawner } from "./iceWallSpawner";
import { Rock } from "./rock";
import { Meteor } from "./meteor";
import { FireWheel } from "./fireWheel";
import { ChainLightning } from "./chainLightning";
import { Acid } from "./acid";
import { Teleport } from "./teleport";
import { MindControl } from "./mindControl";
import { Doragate } from "./doragate";
import { Daosdorg } from "./daosdorg";

export interface Spell<TData = any> {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell<TData>) => Cursor<TData>;
  data: TData;
  elements: Element[];
  cost: number;
  costMultiplier?: () => number;
  stacking?: boolean; // True if this spell does not end the turn
  iconId: number;
}

function spell<TData>(
  cursor: new (character: Character, spell: Spell<TData>) => Cursor<TData>,
  config: Omit<Spell<TData>, "cursor">
) {
  return { ...config, cursor };
}

export const getSpellCost = (spell: Spell) =>
  spell.cost * (spell.costMultiplier?.() || 1);

const MELEE = spell(ApplyCursor, {
  name: "Melee",
  description: "For less gifted sorcerers",
  elements: [Element.Physical],
  cost: 0,
  data: {
    applyKeys: [Key.M1],
    apply: (character: Character) => character.melee(),
    turnState: TurnState.Ending,
  },
  iconId: 0,
});

const FIREBALL = spell(PoweredArcaneCircle, {
  name: "Ignis",
  description: "Fireball!",
  elements: [Element.Elemental],
  cost: 10,
  data: {
    projectile: Fireball,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 1,
});

const ARTHUR_SWORD = spell(ArrowDown, {
  name: "Excalibur",
  description: "Giant sword from the sky",
  elements: [Element.Physical, Element.Arcane],
  cost: 35,
  data: {
    projectile: Sword,
    xOffset: -5.5,
    yOffset: 0,
    turnState: TurnState.Attacked,
    spellSource: true,
  },
  iconId: 12,
});

const TELEKINESIS = spell(Lock, {
  name: "Eisherz",
  description: "Telekinesis",
  elements: [Element.Physical, Element.Life],
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  cost: 40,
  data: {
    target: Target.Character,
    projectile: Telekinesis,
    turnState: TurnState.Ongoing,
  },
  iconId: 20,
});

const SHIELD = spell(ArcaneCircle, {
  name: "Felsenschild",
  description: "A magical shield capable of stopping most spells",
  elements: [Element.Physical, Element.Life],
  cost: 10,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  stacking: true,
  data: {
    projectile: Shield,
    xOffset: 10,
    yOffset: 14,
    x: -8,
    y: -3,
    turnState: TurnState.Ongoing,
  },
  iconId: 2,
});

const BAKURETSU = spell(ArrowDown, {
  name: "Bakuretsu",
  description: "Ekusuuu ploooooooosion",
  elements: [Element.Elemental, Element.Arcane],
  cost: 70,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Arcane) || 1) * 0.4,
  data: {
    projectile: Bakuretsu,
    xOffset: 0,
    yOffset: 0,
    turnState: TurnState.Attacked,
  },
  iconId: 24,
});

const ZOLTRAAK = spell(ArcaneCircle, {
  name: "Zoltraak",
  description: "Ordinary offensive magic",
  elements: [Element.Arcane],
  cost: 35,
  data: {
    projectile: Zoltraak,
    xOffset: 2,
    yOffset: 2,
    x: 3,
    y: 8,
    turnState: TurnState.Ending,
  },
  iconId: 18,
});

const WINGS = spell(ApplyCursor, {
  name: "Digardnacht",
  description: "Wings that grant flight",
  elements: [Element.Physical, Element.Life],
  cost: 15,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  stacking: true,
  data: {
    applyKeys: [Key.Up, Key.W],
    apply: (character: Character) => character.giveWings(),
  },
  iconId: 6,
});

const CATASTRAVIA = spell(PoweredArcaneCircle, {
  name: "Catastravia",
  description: "Holy missile volley",
  elements: [Element.Life, Element.Arcane],
  cost: 50,
  data: {
    projectile: Catastravia,
    xOffset: 2,
    yOffset: 2,
    x: 3,
    y: 8,
    turnState: TurnState.Attacked,
  },
  iconId: 22,
});

const MAGIC_MISSILE = spell(ApplyCursor, {
  name: "Vollzanbel",
  description: "Guided missile",
  elements: [Element.Arcane, Element.Life],
  cost: 40,
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
  iconId: 21,
});

const BABYLON = spell(ArrowDown, {
  name: "Gates of babylon",
  description: "Drop swords from the sky",
  elements: [Element.Physical],
  cost: 20,
  data: {
    projectile: GateOfBabylon,
    xOffset: -0.5,
    yOffset: 0,
    turnState: TurnState.Attacked,
  },
  iconId: 13,
});

const BLINK = spell(ApplyCursor, {
  name: "Jilwer",
  description: "Blink forwards",
  elements: [Element.Physical],
  cost: 16,
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

      Level.instance.add(new Blink(rotation, character));
    },
  },
  iconId: 4,
});

const REELSEIDEN = spell(Lock, {
  name: "Reelseiden",
  description: "Slash anything anywhere",
  elements: [Element.Physical],
  cost: 25,
  data: {
    target: Target.Any,
    projectile: Reelseiden,
    turnState: TurnState.Ending,
  },
  iconId: -1,
});

const NEPHTEAR = spell(PoweredArcaneCircle, {
  name: "Nephtear",
  description: "Ice spike",
  elements: [Element.Elemental],
  cost: 14,
  data: {
    projectile: Nephtear,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 5,
});

const WIND_BLAST = spell(PoweredArcaneCircle, {
  name: "Medrozobalt",
  description: "Create a gust of wind",
  elements: [Element.Elemental, Element.Life],
  cost: 10,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  data: {
    projectile: WindBlast,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
  },
  iconId: 3,
});

const HAIRPIN = spell(PoweredArcaneCircle, {
  name: "Balterie",
  description: "Launch several bombs that detonate on contact",
  elements: [Element.Arcane],
  cost: 30,
  data: {
    projectile: Hairpin,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
  },
  iconId: 14,
});

const ICE_WALL = spell(ArcaneCircle, {
  name: "Jubelade",
  description: "Create several ice clusters on the ground",
  elements: [Element.Elemental, Element.Physical],
  cost: 12,
  data: {
    projectile: IceWallSpawner,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 7,
});

const ROCK = spell(PoweredArcaneCircle, {
  name: "Bargland",
  description: "Control the earth",
  elements: [Element.Life, Element.Elemental],
  cost: 30,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  stacking: true,
  data: {
    projectile: Rock,
    xOffset: 0,
    yOffset: 0,
    x: 0,
    y: 0,
    turnState: TurnState.Ongoing,
  },
  iconId: 15,
});

const METEOR = spell(Lock, {
  name: "Waldgose",
  description: "Cause a meteor to fall from the sky",
  elements: [Element.Physical, Element.Elemental],
  cost: 60,
  data: {
    target: Target.Any,
    projectile: Meteor,
    turnState: TurnState.Attacked,
  },
  iconId: 23,
});

const FIRE_WHEEL = spell(PoweredArcaneCircle, {
  name: "Flammendorn",
  description: "Throwable fireball that follows the ground",
  elements: [Element.Elemental, Element.Arcane],
  cost: 20,
  data: {
    projectile: FireWheel,
    xOffset: 14,
    yOffset: 17.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 8,
});

const LIGHTNING = spell(ArcaneCircle, {
  name: "Judradjim",
  description: "Generate chain lightning",
  elements: [Element.Elemental],
  cost: 25,
  data: {
    projectile: ChainLightning,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 10,
});

const ACID = spell(PoweredArcaneCircle, {
  name: "Reamstroha",
  description: "Create a ball of acid",
  elements: [Element.Life],
  cost: 25,
  data: {
    projectile: Acid,
    xOffset: 15,
    yOffset: 18.5,
    x: 3,
    y: 7,
    turnState: TurnState.Attacked,
  },
  iconId: 11,
});

const TELEPORT = spell(Lock, {
  name: "Fürwehrer",
  description: "Houdini yourself out of a sticky situation",
  elements: [Element.Life],
  cost: 20,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  data: {
    target: Target.Free,
    projectile: Teleport,
    turnState: TurnState.Ending,
    spellSource: true,
  },
  iconId: 9,
});

const MIND_CONTROL = spell(Lock, {
  name: "Auserlese",
  description: "Swap control with another ally",
  elements: [Element.Life],
  cost: 20,
  costMultiplier: () =>
    1.4 - (Manager.instance?.getElementValue(Element.Life) || 1) * 0.4,
  stacking: true,
  data: {
    target: Target.Ally,
    projectile: MindControl,
    turnState: TurnState.Ongoing,
    spellSource: true,
  },
  iconId: 16,
});

const DORAGATE = spell(ArcaneCircle, {
  name: "Doragate",
  description: "Rocks to bullets",
  elements: [Element.Physical, Element.Arcane],
  cost: 30,
  data: {
    projectile: Doragate,
    xOffset: 0,
    yOffset: 0,
    x: 0,
    y: 0,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
  },
  iconId: 17,
});

const DAOSDORG = spell(ArcaneCircle, {
  name: "Daosdorg",
  description: "Magic tornado",
  elements: [Element.Physical, Element.Arcane],
  cost: 35,
  data: {
    projectile: Daosdorg,
    xOffset: 13,
    yOffset: 15,
    x: 0,
    y: -3,
    turnState: TurnState.Attacked,
  },
  iconId: 19,
});

export const SPELLS: Spell[] = [
  MELEE,
  FIREBALL,
  ARTHUR_SWORD,
  // TELEKINESIS,
  SHIELD,
  BAKURETSU,
  ZOLTRAAK,
  WINGS,
  CATASTRAVIA,
  MAGIC_MISSILE,
  BABYLON,
  BLINK,
  // REELSEIDEN,
  DAOSDORG,
  NEPHTEAR,
  WIND_BLAST,
  HAIRPIN,
  ICE_WALL,
  ROCK,
  METEOR,
  FIRE_WHEEL,
  LIGHTNING,
  ACID,
  TELEPORT,
  MIND_CONTROL,
  DORAGATE,
].sort((a, b) => a.cost - b.cost);
