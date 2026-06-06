import { CollisionMask } from "../../collision/collisionMask";

/**
 * Choose a steering heading (radians) for a guided missile at `fromGame` aiming for
 * `targetGame` (game units). Samples the direct heading plus symmetric angular offsets,
 * rejecting any that hit terrain within `lookaheadGameUnits`, and returns the
 * collision-free heading closest to the direct target direction. Falls back to the
 * direct heading if every candidate is blocked (keep homing rather than freeze).
 */
export function chooseGuidanceHeading(
  surface: CollisionMask,
  fromGame: [number, number],
  targetGame: [number, number],
  lookaheadGameUnits: number,
): number {
  const direct = Math.atan2(
    targetGame[1] - fromGame[1],
    targetGame[0] - fromGame[0],
  );

  const offsets = [0, -0.3, 0.3, -0.6, 0.6, -0.9, 0.9, -1.2, 1.2];
  for (const off of offsets) {
    const heading = direct + off;
    const ahead: [number, number] = [
      fromGame[0] + Math.cos(heading) * lookaheadGameUnits,
      fromGame[1] + Math.sin(heading) * lookaheadGameUnits,
    ];
    if (
      !surface.collidesWithLine(
        Math.round(fromGame[0]),
        Math.round(fromGame[1]),
        Math.round(ahead[0]),
        Math.round(ahead[1]),
      )
    ) {
      return heading;
    }
  }
  return direct;
}
