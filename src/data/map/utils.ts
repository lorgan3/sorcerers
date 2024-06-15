import { CollisionMask } from "../collision/collisionMask";

export const probeX = (
  surface: CollisionMask,
  x: number,
  y = 0,
  resolution = 1
) => {
  let belowAir = false;
  const j = Math.round(x);
  for (let i = Math.round(y); i < surface.height; i += resolution) {
    if (surface.collidesWithPoint(j, i)) {
      if (!belowAir) {
        continue;
      }

      return i;
    }

    belowAir = true;
  }

  return surface.height;
};
