import { ExplosiveDamage } from "../../damage/explosiveDamage";
import { ImpactDamage } from "../../damage/impactDamage";
import { FallDamage, Shape } from "../../damage/fallDamage";
import { Element } from "../types";
import { getManager, getServer } from "../../context";

export interface ExplosiveDamageConfig {
  radius: number;
  intensity: number;
  base: number;
  element: Element;
  multiplier: number;
}

export interface ImpactDamageConfig {
  base: number;
  element: Element;
  multiplier: number;
}

export interface FallDamageConfig {
  shape: Shape;
  base: number;
  element: Element;
  multiplier: number;
}

export function applyExplosiveDamage(
  x: number,
  y: number,
  config: ExplosiveDamageConfig
) {
  getServer()!.damage(
    new ExplosiveDamage(
      x,
      y,
      config.radius,
      config.intensity,
      config.base +
        getManager().getElementValue(config.element) * config.multiplier
    ),
    getServer()!.getActivePlayer()
  );
}

export function applyImpactDamage(
  x: number,
  y: number,
  direction: number,
  config: ImpactDamageConfig
) {
  getServer()!.damage(
    new ImpactDamage(
      x,
      y,
      direction,
      config.base *
        (config.multiplier +
          getManager().getElementValue(config.element) *
            (1 - config.multiplier))
    ),
    getServer()!.getActivePlayer()
  );
}

export function applyFallDamage(
  x: number,
  y: number,
  config: FallDamageConfig
) {
  getServer()!.damage(
    new FallDamage(
      x,
      y,
      config.shape,
      config.base +
        getManager().getElementValue(config.element) * config.multiplier
    ),
    getServer()!.getActivePlayer()
  );
}
