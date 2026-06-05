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
  let peakIdx = 0;
  for (let x = 1; x < env.length; x++) {
    if (env[x] > env[peakIdx]) peakIdx = x;
  }
  for (let x = 0; x < peakIdx; x++) env[x] = env[peakIdx];
  return env;
})();

// Body's MAX_STEP (body.ts): feet clamber up this far onto a ledge corner, so a
// jump whose apex stops a few px below the target still lands.
const LANDING_CLAMBER = 3;

export function jumpReaches(dx: number, dyUp: number): boolean {
  const i = Math.floor(Math.abs(dx));
  if (i >= JUMP_HEIGHT_AT_DISTANCE.length) {
    return false;
  }
  return dyUp <= JUMP_HEIGHT_AT_DISTANCE[i] + LANDING_CLAMBER;
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
