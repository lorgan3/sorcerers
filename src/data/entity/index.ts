import { Catastravia } from "../spells/catastravia";
import { CatastraviaMissile } from "../spells/catastraviaMissile";
import { Fireball } from "../spells/fireball";
import { Shield } from "../spells/shield";
import { Element } from "../spells/types";
import { Zoltraak } from "../spells/zoltraak";
import { Character } from "./character";
import { MagicScroll } from "./magicScroll";
import { Potion } from "./potion";
import { PotionType } from "./potionData";
import { EntityType, Item, Spawnable } from "./types";

let id = 0;

export const setId = (value: number) => (id = value);

export const getId = () => id++;

export const ENTITIES: Record<
  EntityType,
  { create: (data: any) => Spawnable }
> = {
  [EntityType.Shield]: Shield,
  [EntityType.Zoltraak]: Zoltraak,
  [EntityType.Fireball]: Fireball,
  [EntityType.Character]: Character,
  [EntityType.MagicScroll]: MagicScroll,
  [EntityType.Potion]: Potion,
  [EntityType.Catastravia]: Catastravia,
  [EntityType.CatastraviaMissile]: CatastraviaMissile,
};

interface SpawnRateData {
  spawn: (x: number, y: number) => Item;
  weight: number;
}

const SPAWN_RATES: SpawnRateData[] = [
  {
    spawn: (x: number, y: number) => new Potion(x, y, PotionType.HealthPotion),
    weight: 1,
  },
  {
    spawn: (x: number, y: number) =>
      new Potion(x, y, PotionType.SmallHealthPotion),
    weight: 2,
  },
  {
    spawn: (x: number, y: number) => new Potion(x, y, PotionType.ManaPotion),
    weight: 2,
  },
  {
    spawn: (x: number, y: number) =>
      new Potion(x, y, PotionType.SmallManaPotion),
    weight: 3,
  },
  {
    spawn: (x: number, y: number) => new MagicScroll(x, y, Element.Arcane),
    weight: 1,
  },
  {
    spawn: (x: number, y: number) => new MagicScroll(x, y, Element.Elemental),
    weight: 1,
  },
  {
    spawn: (x: number, y: number) => new MagicScroll(x, y, Element.Life),
    weight: 1,
  },
  {
    spawn: (x: number, y: number) => new MagicScroll(x, y, Element.Physical),
    weight: 1,
  },
];

const totalWeight = SPAWN_RATES.reduce(
  (sum, spawnRate) => sum + spawnRate.weight,
  0
);

export const getRandomItem = (x: number, y: number) => {
  const rnd = Math.random() * totalWeight;

  let weight = 0;
  for (let spawnRate of SPAWN_RATES) {
    weight += spawnRate.weight;

    if (weight >= rnd) {
      return spawnRate.spawn(x, y);
    }
  }

  throw new Error("Should not happen!");
};
