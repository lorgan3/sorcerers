import { circle3x3 } from "../collision/precomputed/circles";
import { EntityType } from "../entity/types";
import { Element } from "./types";
import { Sound } from "../../sound";
import { defineProjectile } from "./defineProjectile";
import { map } from "../../util/math";

export const nephtear = defineProjectile({
  type: EntityType.Nephtear,
  body: {
    mask: circle3x3,
    friction: 1,
    gravity: 0.01,
  },
  sprite: {
    animation: "spells_iceSpike",
    animationSpeed: 0.1,
    anchor: [0.5, 0.5],
    scale: 2,
    offset: [8, 8],
    rotateWithDirection: true,
  },
  particles: {
    animation: "spells_sparkle",
    config: {
      spawnRange: 16,
      lifeTime: 20,
      lifeTimeVariance: 1,
      initialize: (pos) => ({
        x: pos.x + 8,
        y: pos.y + 8,
        scale: map(0.5, 1, Math.random()),
        xVelocity: Math.random() - 0.5,
        yVelocity: Math.random() - 0.5,
      }),
    },
  },
  sound: Sound.Glass,
  lifetime: 200,
  damage: {
    type: "impact",
    base: 30,
    element: Element.Elemental,
    multiplier: 0.7,
  },
  deathEffect: "iceImpact",
  centerOffset: [8, 8],
  cast: { speed: (power) => 2 + power / 3 },
});

export const Nephtear = nephtear;
