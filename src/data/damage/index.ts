import { ExplosiveDamage } from "./explosiveDamage";
import { FallDamage } from "./fallDamage";
import { GenericDamage } from "./genericDamage";
import { ImpactDamage } from "./impactDamage";
import { DamageSource, DamageSourceType } from "./types";

export const DAMAGE_SOURCES: Record<
  DamageSourceType,
  { deserialize: (data: any) => DamageSource }
> = {
  [DamageSourceType.Explosive]: ExplosiveDamage,
  [DamageSourceType.Falling]: FallDamage,
  [DamageSourceType.Generic]: GenericDamage,
  [DamageSourceType.Impact]: ImpactDamage,
};
