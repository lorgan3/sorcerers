import { Shield } from "../spells/shield";
import { EntityType, HurtableEntity } from "./types";

let id = 0;

export const setId = (value: number) => (id = value);

export const getId = () => id++;

export const ENTITIES: Partial<
  Record<EntityType, { create: (data: any) => HurtableEntity }>
> = {
  [EntityType.Shield]: Shield,
};
