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

export interface Spell<TData = any> {
  name: string;
  description?: string;
  cursor: new (character: Character, spell: Spell<TData>) => Cursor<TData>;
  data: TData;
  elements: Element[];
  cost: number;
  costMultiplier?: () => number;
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
  name: "Excalibur",
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

const BLINK = spell(ApplyCursor, {
  name: "Blink",
  elements: [Element.Physical],
  cost: 15,
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
});

const REELSEIDEN = spell(Lock, {
  name: "Reelseiden",
  description: "Slash anything anywhere",
  elements: [Element.Physical],
  cost: 30,
  data: {
    target: Target.Any,
    projectile: Reelseiden,
    turnState: TurnState.Ending,
  },
});

const NEPHTEAR = spell(PoweredArcaneCircle, {
  name: "Nephtear",
  description: "Ice spike",
  elements: [Element.Elemental],
  cost: 20,
  data: {
    projectile: Nephtear,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const WIND_BLAST = spell(PoweredArcaneCircle, {
  name: "Airblast",
  description: "Mmph mph-mph mmmmph!",
  elements: [Element.Life],
  cost: 10,
  data: {
    projectile: WindBlast,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
  },
});

const HAIRPIN = spell(PoweredArcaneCircle, {
  name: "Artillery",
  elements: [Element.Arcane],
  cost: 20,
  data: {
    projectile: Hairpin,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
  },
});

const ICE_WALL = spell(ArcaneCircle, {
  name: "Ice wall",
  elements: [Element.Elemental, Element.Physical],
  cost: 20,
  data: {
    projectile: IceWallSpawner,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const ROCK = spell(PoweredArcaneCircle, {
  name: "Rock",
  elements: [Element.Life, Element.Elemental],
  cost: 30,
  data: {
    projectile: Rock,
    xOffset: 0,
    yOffset: 0,
    x: 0,
    y: 0,
    turnState: TurnState.Attacked,
  },
});

const METEOR = spell(Lock, {
  name: "Meteor",
  elements: [Element.Physical, Element.Elemental],
  cost: 40,
  data: {
    target: Target.Any,
    projectile: Meteor,
    turnState: TurnState.Attacked,
  },
});

const FIRE_WHEEL = spell(PoweredArcaneCircle, {
  name: "Flame wheel",
  description: "",
  elements: [Element.Elemental],
  cost: 20,
  data: {
    projectile: FireWheel,
    xOffset: 14,
    yOffset: 17.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const LIGHTNING = spell(ArcaneCircle, {
  name: "Chain lightning",
  description: "Unlimited power",
  elements: [Element.Arcane],
  cost: 10,
  data: {
    projectile: ChainLightning,
    xOffset: 7,
    yOffset: 10.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const ACID = spell(PoweredArcaneCircle, {
  name: "Acid",
  description: "",
  elements: [Element.Life],
  cost: 25,
  data: {
    projectile: Acid,
    xOffset: 15,
    yOffset: 18.5,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
  },
});

const TELEPORT = spell(Lock, {
  name: "Teleport",
  description: "Houdini yourself out of a sticky situation",
  elements: [Element.Physical],
  cost: 20,
  data: {
    target: Target.Free,
    projectile: Teleport,
    turnState: TurnState.Ending,
    spellSource: true,
  },
});

const MIND_CONTROL = spell(Lock, {
  name: "Mind control",
  description: "Swap control with another ally",
  elements: [Element.Life],
  cost: 15,
  data: {
    target: Target.Ally,
    projectile: MindControl,
    turnState: TurnState.Ongoing,
    spellSource: true,
  },
});

const DORAGATE = spell(ArcaneCircle, {
  name: "Doragate",
  description: "Rocks to bullets",
  elements: [Element.Physical],
  cost: 15,
  data: {
    projectile: Doragate,
    xOffset: 0,
    yOffset: 0,
    x: 3,
    y: 6.5,
    turnState: TurnState.Attacked,
    keepSpellSource: true,
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
  BLINK,
  REELSEIDEN,
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
];
