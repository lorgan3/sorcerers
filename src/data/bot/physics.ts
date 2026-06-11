import {
  AIR_CONTROL,
  AIR_FRICTION,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_STRENGTH,
  SPEED,
} from "../collision/physicsConstants";

export const WALK_TERMINAL_VELOCITY = SPEED / (1 - GROUND_FRICTION);

// Mirrors body.ts:tick(dt=1) integration order; physics.spec.ts reproduces it.
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
  return { apexFrame, airtimeFrames: 120, peakHeight: -peak, distance: s.x };
}

const STANDING_JUMP = simulateJump(0);
const RUNNING_JUMP = simulateJump(WALK_TERMINAL_VELOCITY);

export const APEX_FRAMES = STANDING_JUMP.apexFrame;

export const AIRTIME_FRAMES = STANDING_JUMP.airtimeFrames;

export const MAX_JUMP_HEIGHT = Math.floor(STANDING_JUMP.peakHeight);

export const MAX_JUMP_DISTANCE = Math.floor(RUNNING_JUMP.distance);

// Mirror of BOUNCE_TRIGGER_ACTIVE in character.ts; landing faster deals damage.
export const SAFE_LANDING_SPEED = 4;

export const MAX_SAFE_FALL_HEIGHT: number = (() => {
  let s = { x: 0, y: 0, xv: 0, yv: 0 };
  let safeHeight = 0;
  for (let frame = 0; frame < 200; frame++) {
    const next = airStep(s, 0);
    if (next.yv > SAFE_LANDING_SPEED) {
      break;
    }
    safeHeight = next.y;
    s = next;
  }
  return Math.floor(safeHeight);
})();

const { env: JUMP_HEIGHT_AT_DISTANCE, peakIdx: JUMP_APEX_DISTANCE } = (() => {
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
  let peakIdx = 0;
  for (let x = 1; x < env.length; x++) {
    if (env[x] > env[peakIdx]) peakIdx = x;
  }
  for (let x = 0; x < peakIdx; x++) env[x] = env[peakIdx];
  return { env, peakIdx };
})();

// Body's MAX_STEP (body.ts): feet clamber up this far onto a ledge corner, so a
// jump whose apex stops a few px below the target still lands.
const LANDING_CLAMBER = 3;

export function jumpReaches(dx: number, dyUp: number): boolean {
  const i = Math.floor(Math.abs(dx));
  if (i >= JUMP_HEIGHT_AT_DISTANCE.length) {
    return false;
  }
  // The clamber only helps on the descending side of the arc, where leftover
  // horizontal motion slides the feet onto the lip top. A near-vertical ascent
  // (dx before the apex) meets the ledge face with no sideways motion left, so
  // it must clear the full height.
  const clamber = i >= JUMP_APEX_DISTANCE ? LANDING_CLAMBER : 0;
  return dyUp <= JUMP_HEIGHT_AT_DISTANCE[i] + clamber;
}

// Height (px) the arc passes through at horizontal distance `dx`, launching at
// `launchX` while holding air-control toward the target. -Infinity if the arc
// lands before reaching dx.
function jumpHeightAtDistance(launchX: number, dx: number): number {
  let s = { x: 0, y: 0, xv: launchX, yv: -JUMP_STRENGTH };
  let prev = s;
  for (let frame = 1; frame <= 200; frame++) {
    s = airStep(s, 1);
    if (prev.x <= dx && s.x >= dx) {
      const t = (dx - prev.x) / (s.x - prev.x || 1);
      return -(prev.y + t * (s.y - prev.y));
    }
    if (s.y > 0 && frame > 1) {
      return -Infinity;
    }
    prev = s;
  }
  return -Infinity;
}

const requiredLaunchSpeedCache = new Map<string, number>();

// Smallest launch speed whose arc passes the full `dyUp` at horizontal
// distance `dx`. No clamber discount here: an arc that meets the ledge's wall
// face even fractionally below the lip is stopped dead, not clambered (the
// auto-step only applies to grounded movement). Falls back to the best-effort
// speed when no sampled arc reaches the target.
export function requiredLaunchSpeed(dx: number, dyUp: number): number {
  const target = Math.ceil(Math.abs(dx));
  if (target < 1 || dyUp <= 0) {
    return 0;
  }

  const key = `${target},${Math.ceil(dyUp)}`;
  const cached = requiredLaunchSpeedCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const samples = 24;
  let best = 0;
  let bestHeight = -Infinity;
  let result: number | undefined;
  for (let i = 0; i <= samples; i++) {
    const speed = (WALK_TERMINAL_VELOCITY * i) / samples;
    const height = jumpHeightAtDistance(speed, target);
    if (height >= dyUp) {
      result = speed;
      break;
    }
    if (height > bestHeight) {
      bestHeight = height;
      best = speed;
    }
  }
  if (result === undefined) {
    result = best;
  }
  requiredLaunchSpeedCache.set(key, result);
  return result;
}

// Horizontal travel of the remaining arc when braking as hard as air-control
// allows, from velocity (xv, yv), until the arc has descended `dyDown` px below
// the current height. Lets the follower ask "if I brake right now, where do I
// land?" — if even that overshoots the target, it must brake immediately.
export function brakingLandingOffset(
  xv: number,
  yv: number,
  dyDown: number,
): number {
  if (dyDown <= 0) {
    return 0;
  }
  const direction = Math.sign(xv);
  let s = { x: 0, y: 0, xv, yv };
  for (let frame = 1; frame <= 240; frame++) {
    const brake = Math.sign(s.xv) === direction ? -direction : 0;
    s = airStep(s, brake as -1 | 0 | 1);
    if (s.y >= dyDown) {
      return s.x;
    }
  }
  return s.x;
}

export const MIN_LAUNCH_SPEED = WALK_TERMINAL_VELOCITY * 0.75;

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
  return Math.ceil(x);
}
