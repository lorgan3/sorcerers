import { CollisionMask } from "../collision/collisionMask";

export const probeX = (
  surface: CollisionMask,
  x: number,
  y = 0,
  resolution = 1
) => {
  const j = Math.round(x);
  for (let i = Math.round(y); i < surface.height; i += resolution) {
    if (surface.collidesWithPoint(j, i)) {
      return i;
    }
  }

  return surface.height;
};
