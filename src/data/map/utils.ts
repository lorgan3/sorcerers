import { CollisionMask } from "../collision/collisionMask";
import { rectangle1x200 } from "../collision/precomputed/rectangles";

// @todo: This probably doesn't work correctly for maps > 400px
export const probeX = (surface: CollisionMask, x: number) => {
  let y = 0;
  let distance = surface.height;
  while (distance > 1) {
    distance /= 2;

    if (
      !surface.collidesWith(rectangle1x200, x, Math.round(y + distance - 200))
    ) {
      y += distance;
    }
  }

  return Math.round(y);
};
