import {
  AIR_CONTROL,
  AIR_FRICTION,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_STRENGTH,
  SPEED,
} from "../collision/physicsConstants";

// Walking terminal velocity: equilibrium of v = v * f + a, so v = a / (1 - f).
export const WALK_TERMINAL_VELOCITY = SPEED / (1 - GROUND_FRICTION);

/**
 * Faithful one-frame body.ts integration step (dt = 1, in-air): friction first,
 * then compute diff = v + a/2, then update velocity by a.
 * Kept private — tests in __spec__/physics.spec.ts mirror this to verify the
 * derived constants below stay honest.
 */
function airStep(
  state: { x: number; y: number; xv: number; yv: number },
  walkDirection: -1 | 0 | 1,
) {
  const xv = state.xv * AIR_FRICTION;
  const yv = state.yv * AIR_FRICTION;
  const xAcc = walkDirection * SPEED * AIR_CONTROL;
  const yAcc = GRAVITY;
  return {
    x: state.x + xv + xAcc * 0.5,
    y: state.y + yv + yAcc * 0.5,
    xv: xv + xAcc,
    yv: yv + yAcc,
  };
}

/**
 * Simulate a jump and return (apexFrame, airtimeFrames, peakHeight, distanceAtLanding)
 * with the given launch velocity. dx walks +1 throughout (full air-control input).
 */
function simulateJump(launchX: number) {
  let s = { x: 0, y: 0, xv: launchX, yv: -JUMP_STRENGTH };
  let peak = 0;
  let apexFrame = 0;
  for (let frame = 1; frame <= 120; frame++) {
    s = airStep(s, 1);
    if (s.y < peak) {
      peak = s.y;
      apexFrame = frame;
    }
    if (s.y > 0) {
      return {
        apexFrame,
        airtimeFrames: frame,
        peakHeight: -peak,
        distance: s.x,
      };
    }
  }
  // Shouldn't happen with reasonable JUMP_STRENGTH/GRAVITY.
  return { apexFrame, airtimeFrames: 120, peakHeight: -peak, distance: s.x };
}

const STANDING_JUMP = simulateJump(0);
const RUNNING_JUMP = simulateJump(WALK_TERMINAL_VELOCITY);

// Frame at which yVelocity crosses zero in the friction-included simulation.
export const APEX_FRAMES = STANDING_JUMP.apexFrame;

// Total airtime from launch to landing back at y=0.
export const AIRTIME_FRAMES = STANDING_JUMP.airtimeFrames;

// Peak height above launch point, in pixels (rounded down for conservative graph planning).
export const MAX_JUMP_HEIGHT = Math.floor(STANDING_JUMP.peakHeight);

// Maximum horizontal jump distance from a running launch at WALK_TERMINAL_VELOCITY,
// holding air-control for the full flight. Rounded down for conservative graph planning.
export const MAX_JUMP_DISTANCE = Math.floor(RUNNING_JUMP.distance);

// Jump reachability envelope: the maximum height (px above launch) a jump can
// reach at each integer horizontal distance. MAX_JUMP_HEIGHT and
// MAX_JUMP_DISTANCE are independent caps; this couples them, so the graph can
// reject jumps that demand near-max height AND near-max distance at once —
// physically impossible in a single arc.
const JUMP_HEIGHT_AT_DISTANCE: number[] = (() => {
  const env: number[] = [0];
  const samples = 24;
  for (let i = 0; i <= samples; i++) {
    const launchX = (WALK_TERMINAL_VELOCITY * i) / samples;
    let s = { x: 0, y: 0, xv: launchX, yv: -JUMP_STRENGTH };
    let prev = { x: 0, h: 0 };
    for (let frame = 1; frame <= 200; frame++) {
      s = airStep(s, 1);
      const cur = { x: s.x, h: -s.y };
      for (let xi = Math.ceil(prev.x); xi <= Math.floor(cur.x); xi++) {
        const t = (xi - prev.x) / (cur.x - prev.x || 1);
        const h = prev.h + t * (cur.h - prev.h);
        if (env[xi] === undefined || h > env[xi]) {
          env[xi] = h;
        }
      }
      prev = cur;
      if (s.y > 0 && frame > 1) break;
    }
  }
  // The samples above hold full forward air-control, which pushes the apex out
  // to x≈10 — so they understate the height at very short distances. But the
  // bot can withhold air-control and jump nearly straight up, reaching the apex
  // at x≈0. So at any distance up to where the arc peaks, the full apex height
  // is reachable: flatten the rising side to the peak.
  let peakIdx = 0;
  for (let x = 1; x < env.length; x++) {
    if (env[x] > env[peakIdx]) peakIdx = x;
  }
  for (let x = 0; x < peakIdx; x++) env[x] = env[peakIdx];
  return env;
})();

// Extra vertical reach beyond the ballistic arc when landing on a ledge. The
// body steps up to MAX_STEP (3px, body.ts) as its feet reach a ledge corner,
// so a jump whose apex stops a hair below the target still clambers onto it.
// This is what makes near-vertical jumps to a ledge ~MAX_JUMP_HEIGHT+ high land
// (the apex is ~21.95px, so a clean 22px step would otherwise be rejected).
const LANDING_CLAMBER = 3;

/**
 * Whether a jump from a surface can clear `dyUp` pixels of rise over `dx`
 * pixels of horizontal distance. `dyUp` is positive for an upward target,
 * zero/negative for a level-or-downward one (always reachable within range).
 * Distances past the arc's reach return false.
 */
export function jumpReaches(dx: number, dyUp: number): boolean {
  const i = Math.floor(Math.abs(dx));
  if (i >= JUMP_HEIGHT_AT_DISTANCE.length) {
    return false;
  }
  return dyUp <= JUMP_HEIGHT_AT_DISTANCE[i] + LANDING_CLAMBER;
}

// Minimum launch xVelocity required to reach a jump's nominal max distance with margin.
// Below this threshold, the bot should walk longer before launching.
// Set to 75% of terminal velocity — generous enough that the bot isn't paralysed by tiny
// velocity dips, strict enough to avoid launching from near-standstill.
export const MIN_LAUNCH_SPEED = WALK_TERMINAL_VELOCITY * 0.75;

// Run-up distance needed to accelerate from rest to MIN_LAUNCH_SPEED.
// Simulated via the recurrence v_{n+1} = v_n * GROUND_FRICTION + SPEED.
// Closed form: v_n = (SPEED / (1 - GROUND_FRICTION)) * (1 - GROUND_FRICTION^n).
// Solve for n where v_n >= MIN_LAUNCH_SPEED. Then sum positions: x_n = sum of v_i for i=1..n.
export function runUpDistanceFromRest(): number {
  let v = 0;
  let x = 0;
  for (let frames = 0; frames < 60; frames++) {
    v = v * GROUND_FRICTION + SPEED;
    x += v;
    if (v >= MIN_LAUNCH_SPEED) {
      return Math.ceil(x);
    }
  }
  // Should never happen — MIN_LAUNCH_SPEED is below terminal — but guard anyway.
  return Math.ceil(x);
}
