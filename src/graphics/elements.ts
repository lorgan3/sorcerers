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
