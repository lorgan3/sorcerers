import { circle3x3 } from "../collision/precomputed/circles";
import { EntityType, Priority } from "../entity/types";
import { Element } from "./types";
import { Sound } from "../../sound";
import { defineProjectile } from "./defineProjectile";

export const fireball = defineProjectile({
  type: EntityType.Fireball,
  priority: Priority.Dynamic,
  body: {
    mask: circle3x3,
    friction: 0.96,
    gravity: 0.25,
    bounciness: -0.9,
    bounces: 5,
  },
  sprite: {
    animation: "spells_flame",
    animationSpeed: 0.3,
    anchor: [0.25, 0.5],
  },
  particles: {
    animation: "spells_puff",
    config: {
      initialize: (pos) => ({
        x: pos.x + 8,
        y: pos.y,
        yVelocity: -3,
      }),
    },
  },
  sound: Sound.Fire,
  lifetime: 100,
  damage: {
    type: "explosive",
    radius: 16,
    intensity: 3,
    base: 2,
    element: Element.Arcane,
    multiplier: 1,
  },
  bounceDamage: {
    type: "explosive",
    radius: 4,
    intensity: 1,
    base: 1,
    element: Element.Arcane,
    multiplier: 1,
  },
  deathEffect: "explosion",
  cast: { speed: 1.2 },
});

export const Fireball = fireball;
