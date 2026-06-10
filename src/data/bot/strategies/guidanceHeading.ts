import { CollisionMask } from "../../collision/collisionMask";

export interface GuidanceOptions {
  // Positions (game units) the flight path should keep clear of — typically the
  // caster and allies, since a detonation near them is friendly fire.
  hazards?: [number, number][];
  // How close (game units) a candidate ray may pass a hazard before it gets
  // penalised. Defaults to the missile blast's effective range.
  hazardRadius?: number;
}

const OFFSETS = (() => {
  const offsets = [0];
  for (let off = 0.3; off <= 2.11; off += 0.3) {
    offsets.push(-off, off);
  }
  return offsets;
})();

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared))
    : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Choose a steering heading (radians) for a guided missile at `fromGame` aiming for
 * `targetGame` (game units). Samples the direct heading plus symmetric angular offsets,
 * rejecting any that hit terrain within `lookaheadGameUnits`, and picks the
 * collision-free heading that stays closest to the direct target direction while
 * keeping clear of `hazards`. Falls back to the direct heading if every candidate
 * is blocked (keep homing rather than freeze).
 */
export function chooseGuidanceHeading(
  surface: CollisionMask,
  fromGame: [number, number],
  targetGame: [number, number],
  lookaheadGameUnits: number,
  options: GuidanceOptions = {},
): number {
  const direct = Math.atan2(
    targetGame[1] - fromGame[1],
    targetGame[0] - fromGame[0],
  );
  const hazards = options.hazards ?? [];
  const hazardRadius = options.hazardRadius ?? 21;

  let best: number | null = null;
  let bestCost = Infinity;
  for (const off of OFFSETS) {
    const heading = direct + off;
    const ahead: [number, number] = [
      fromGame[0] + Math.cos(heading) * lookaheadGameUnits,
      fromGame[1] + Math.sin(heading) * lookaheadGameUnits,
    ];
    if (
      surface.collidesWithLine(
        Math.round(fromGame[0]),
        Math.round(fromGame[1]),
        Math.round(ahead[0]),
        Math.round(ahead[1]),
      )
    ) {
      continue;
    }

    // Cost: stay close to the direct heading, but swing wide of hazards. A grazed
    // hazard costs up to 2 rad of detour, so the missile prefers a long way around
    // over skimming terrain right next to an ally.
    let cost = Math.abs(off);
    for (const [hx, hy] of hazards) {
      const d = pointToSegmentDistance(hx, hy, fromGame[0], fromGame[1], ahead[0], ahead[1]);
      if (d < hazardRadius) {
        cost += 2 * (1 - d / hazardRadius);
      }
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = heading;
    }
  }

  return best ?? direct;
}
