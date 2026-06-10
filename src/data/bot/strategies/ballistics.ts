import { CollisionMask } from "../../collision/collisionMask";

/**
 * Launch headings (radians, y-down screen orientation) for a projectile fired at
 * `speed` under `gravity` to pass through `[dx, dy]` relative to its origin: the
 * flat solution first, the steep lob second, or empty when out of ballistic reach.
 */
export function solveBallisticHeadings(
  dx: number,
  dy: number,
  speed: number,
  gravity: number,
): number[] {
  const adx = Math.abs(dx);
  if (adx < 1) return [];
  const a = (gravity * adx * adx) / (2 * speed ** 2);
  const disc = adx * adx - 4 * a * (a - dy);
  if (disc < 0) return [];
  const hx = Math.sign(dx);
  const flat = (-adx + Math.sqrt(disc)) / (2 * a);
  const steep = (-adx - Math.sqrt(disc)) / (2 * a);
  return [Math.atan2(flat, hx), Math.atan2(steep, hx)];
}

/**
 * Where a projectile fired along `heading` from `fromGame` first strikes the
 * mask, or null if it leaves the map / outlives `maxTicks` without landing.
 */
export function simulateBallisticLanding(
  surface: CollisionMask,
  fromGame: [number, number],
  heading: number,
  speed: number,
  gravity: number,
  maxTicks: number,
): [number, number] | null {
  const vx = Math.cos(heading) * speed;
  const vy = Math.sin(heading) * speed;
  for (let t = 2; t < maxTicks; t += 2) {
    const x = fromGame[0] + vx * t;
    const y = fromGame[1] + vy * t + (gravity / 2) * t * t;
    // Bounds-check the rounded sample so the mask is never probed at width/height.
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (ry >= surface.height || rx < 0 || rx >= surface.width) return null;
    if (ry >= 0 && surface.collidesWithPoint(rx, ry)) {
      return [x, y];
    }
  }
  return null;
}

/**
 * The heading whose simulated landing comes closest to `targetGame`, sampling
 * both ballistic roots plus small perturbations around each (the discrete arc
 * and rough terrain shift the true optimum off the analytic solution). Returns
 * null when nothing lands within `maxMissGame` of the target.
 */
export function chooseBallisticHeading(
  surface: CollisionMask,
  fromGame: [number, number],
  targetGame: [number, number],
  speed: number,
  gravity: number,
  maxTicks: number,
  maxMissGame: number,
): { heading: number; landingGame: [number, number] } | null {
  let best: { heading: number; landingGame: [number, number] } | null = null;
  let bestMiss = maxMissGame;

  for (const root of solveBallisticHeadings(
    targetGame[0] - fromGame[0],
    targetGame[1] - fromGame[1],
    speed,
    gravity,
  )) {
    for (const offset of [0, -0.02, 0.02, -0.05, 0.05]) {
      const heading = root + offset;
      const landing = simulateBallisticLanding(
        surface,
        fromGame,
        heading,
        speed,
        gravity,
        maxTicks,
      );
      if (!landing) continue;
      const miss = Math.hypot(
        landing[0] - targetGame[0],
        landing[1] - targetGame[1],
      );
      if (miss <= bestMiss) {
        bestMiss = miss;
        best = { heading, landingGame: landing };
      }
    }
  }

  return best;
}
