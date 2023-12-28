import { ExplosiveDamage } from "./explosiveDamage";
import { DamageSource, DamageSourceType } from "./types";

export const DAMAGE_SOURCES: Record<
  DamageSourceType,
  { deserialize: (data: any) => DamageSource }
> = {
  [DamageSourceType.Explosive]: ExplosiveDamage,
};
