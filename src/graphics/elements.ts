import Physical from "../assets/icons/physical.png";
import Arcane from "../assets/icons/arcane.png";
import Elemental from "../assets/icons/elemental.png";
import Life from "../assets/icons/life.png";
import { Element } from "../data/spells/types";

export const ELEMENT_MAP: Record<Element, string> = {
  [Element.Physical]: Physical,
  [Element.Arcane]: Arcane,
  [Element.Elemental]: Elemental,
  [Element.Life]: Life,
};

export const ELEMENT_ATLAS_MAP: Record<Element, string> = {
  [Element.Physical]: "icons_physical",
  [Element.Arcane]: "icons_arcane",
  [Element.Elemental]: "icons_elemental",
  [Element.Life]: "icons_life",
};

export const ELEMENT_COLOR_MAP: Record<Element, number> = {
  [Element.Physical]: 0x604f80,
  [Element.Arcane]: 0xd70032,
  [Element.Elemental]: 0x005fe8,
  [Element.Life]: 0x009600,
};
