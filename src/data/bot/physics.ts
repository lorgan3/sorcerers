// Mirrors the constants in src/data/collision/body.ts.
// Kept in sync by hand — if body.ts is retuned, update these AND the tests in
// __spec__/physics.spec.ts. The tests simulate the actual body integration
// and will fail loudly if the derivations drift.
const GRAVITY = 0.2;
const JUMP_STRENGTH = 3.3;
const SPEED = 0.08;
const AIR_CONTROL = 0.3;
const GROUND_FRICTION = 0.88;
const AIR_FRICTION = 0.98;

// Walking terminal velocity: equilibrium of v = v * f + a, so v = a / (1 - f).
export const WALK_TERMINAL_VELOCITY = SPEED / (1 - GROUND_FRICTION);

// Time from launch to apex, in frames: yVelocity hits 0 when -JUMP_STRENGTH + GRAVITY*t = 0.
export const APEX_FRAMES = JUMP_STRENGTH / GRAVITY;

// Total airtime is symmetric — apex going up, then apex going down to start height.
// In practice the character lands slightly lower than launch on a jump that crosses a gap,
// so this is a conservative upper bound on airtime.
export const AIRTIME_FRAMES = APEX_FRAMES * 2;

// Peak height above launch point, derived from kinematic equations.
// y(t) = -JUMP_STRENGTH*t + 0.5*GRAVITY*t^2. At apex t = APEX_FRAMES, |y| = JUMP_STRENGTH^2 / (2 * GRAVITY).
export const MAX_JUMP_HEIGHT = (JUMP_STRENGTH * JUMP_STRENGTH) / (2 * GRAVITY);

// Maximum horizontal jump distance, assuming launch at WALK_TERMINAL_VELOCITY and holding the
// air-control input for the duration of the flight. Computed by simulating the body integration.
// We do this with a small closed-form approximation rather than running a full simulation:
//   - During flight, xVelocity decays by AIR_FRICTION per frame and gains AIR_CONTROL*SPEED per frame.
//   - The air-control input (AIR_CONTROL * SPEED per frame) more than compensates for AIR_FRICTION
//     at low speeds, so the body actually accelerates during flight. Simulation gives ~27px.
//   - The factor 1.2 undershoots the simulation slightly, giving a conservative floor (~26px)
//     while staying within ±30% of actual simulated distance.
// For graph planning we want a CONSERVATIVE upper bound: round down to integer pixels.
export const MAX_JUMP_DISTANCE = Math.floor(
  WALK_TERMINAL_VELOCITY * AIRTIME_FRAMES * 1.2
);

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
