import { Spawnable } from "../../entity/types";
import { getLevel, getServer } from "../../context";
import { CollisionMask } from "../../collision/collisionMask";

export function castProjectile<T extends Spawnable>(
  factory: (collisionMask: CollisionMask) => T
): T | undefined {
  if (!getServer()) return;
  const entity = factory(getLevel().terrain.characterMask);
  getServer()!.create(entity);
  return entity;
}
