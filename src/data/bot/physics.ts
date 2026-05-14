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
