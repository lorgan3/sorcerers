import { Fireball } from "../spells/fireball";
import { Shield } from "../spells/shield";
import { Zoltraak } from "../spells/zoltraak";
import { Character } from "./character";
import { MagicScroll } from "./magicScroll";
import { EntityType, Spawnable } from "./types";

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
};
