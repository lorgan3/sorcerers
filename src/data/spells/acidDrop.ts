import { circle3x3 } from "../collision/precomputed/circles";
import { EntityType } from "../entity/types";
import { Shape } from "../damage/fallDamage";
import { Element } from "./types";
import { Sound } from "../../sound";
import { defineProjectile } from "./defineProjectile";

export const acidDrop = defineProjectile({
  type: EntityType.AcidDrop,
  body: {
    mask: circle3x3,
    friction: 0.99,
    gravity: 0.04,
    bounciness: 1,
  },
  sprite: {
    animation: "spells_acid",
    animationSpeed: 0.3,
    anchor: [0.5, 0.5],
    scale: 2,
    alpha: 0.6,
    offset: [10, 10],
    randomStartFrame: true,
  },
  sound: Sound.Fire,
  lifetime: 200,
  damage: {
    type: "fall",
    shape: Shape.Acid,
    base: 10,
    element: Element.Life,
    multiplier: 1,
  },
  deathEffect: "acidSplash",
  deathSound: Sound.Slime,
  centerOffset: [10, 10],
  cast: { speed: 1 / 1.5 },
});

// Re-export for backwards compatibility with entity registry
export const AcidDrop = acidDrop;
