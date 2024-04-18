import { Character } from "./character";

export enum PotionType {
  ManaPotion,
  SmallManaPotion,
  HealthPotion,
  SmallHealthPotion,
}

export interface PotionData {
  name: string;
  sprite: string;
  activate: (character: Character) => void;
}

export const POTION_DATA: Record<PotionType, PotionData> = {
  [PotionType.HealthPotion]: {
    name: "Big health potion",
    sprite: "items_healthPotion",
    activate: (character) => {
      character.hp += 40;
    },
  },
  [PotionType.SmallHealthPotion]: {
    name: "Small health potion",
    sprite: "items_smallHealthPotion",
    activate: (character) => {
      character.hp += 20;
    },
  },
  [PotionType.ManaPotion]: {
    name: "Big mana potion",
    sprite: "items_manaPotion",
    activate: (character) => {
      character.player.mana += 30;
    },
  },
  [PotionType.SmallManaPotion]: {
    name: "Small health potion",
    sprite: "items_smallManaPotion",
    activate: (character) => {
      character.player.mana += 10;
    },
  },
};
