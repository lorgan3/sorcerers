import { describe, expect, it } from "vitest";
import {
  APEX_FRAMES,
  MAX_JUMP_DISTANCE,
  MAX_JUMP_HEIGHT,
  MAX_SAFE_FALL_HEIGHT,
  MIN_LAUNCH_SPEED,
  SAFE_LANDING_SPEED,
  WALK_TERMINAL_VELOCITY,
  brakingLandingOffset,
  requiredLaunchSpeed,
  runUpDistanceFromRest,
} from "../physics";
import {
  AIR_CONTROL,
  AIR_FRICTION,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_STRENGTH,
  SPEED,
} from "../../collision/physicsConstants";
import { Body } from "../../collision/body";
import { CollisionMask } from "../../collision/collisionMask";

/**
 * One in-air integration step matching body.ts:tick(dt=1) exactly:
 *   1) friction multiplies current velocity
 *   2) compute diff = v * dt + acc * dt^2 / 2 using the post-friction velocity
 *   3) displace by diff
 *   4) update velocity by acc * dt
 *
 * Returns the new state. Walk direction +1 means "hold right air-control input".
 */
function airStep(
  state: { x: number; y: number; xv: number; yv: number },
  walkDirection: -1 | 0 | 1,
) {
  // 1) friction (air, since we're in the air)
  let xv = state.xv * AIR_FRICTION;
  let yv = state.yv * AIR_FRICTION;

  // 2) acceleration this frame
  const xAcc = walkDirection * SPEED * AIR_CONTROL;
  const yAcc = GRAVITY;

  // 3) displacement (dt = 1, idt = 0.5)
  const xDiff = xv * 1 + xAcc * 0.5;
  const yDiff = yv * 1 + yAcc * 0.5;

  // 4) velocity update for next frame
  xv += xAcc;
  yv += yAcc;

  return {
    x: state.x + xDiff,
    y: state.y + yDiff,
    xv,
    yv,
  };
}

describe("physics", () => {
  it("walking terminal velocity matches simulation", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) {
      v = v * GROUND_FRICTION + SPEED;
    }
    expect(WALK_TERMINAL_VELOCITY).toBeCloseTo(v, 3);
  });

  it("apex frames is the integer frame count when yVelocity crosses zero", () => {
    // Faithful body.ts integration: friction THEN gravity each frame.
    let yv = -JUMP_STRENGTH;
    let frames = 0;
    while (yv < 0 && frames < 50) {
      yv = yv * AIR_FRICTION + GRAVITY;
      frames++;
    }
    // Air friction accelerates the climb back to zero — apex arrives slightly before
    // the friction-less closed form (16.5). Tolerance of 1 frame is plenty.
    expect(APEX_FRAMES).toBeGreaterThan(frames - 2);
    expect(APEX_FRAMES).toBeLessThanOrEqual(frames + 1);
  });

  it("max jump height matches faithful integration within 1 pixel", () => {
    let s = { x: 0, y: 0, xv: 0, yv: -JUMP_STRENGTH };
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      s = airStep(s, 0);
      if (s.y < peak) peak = s.y;
      if (s.y > 0) break;
    }
    // MAX_JUMP_HEIGHT is floor()'d for conservative graph planning, so simulation
    // peak should be in [MAX_JUMP_HEIGHT, MAX_JUMP_HEIGHT + 1).
    expect(Math.abs(peak)).toBeGreaterThanOrEqual(MAX_JUMP_HEIGHT);
    expect(Math.abs(peak)).toBeLessThan(MAX_JUMP_HEIGHT + 1);
  });

  it("max jump distance from running launch is within 1 pixel of simulation", () => {
    let s = {
      x: 0,
      y: 0,
      xv: WALK_TERMINAL_VELOCITY,
      yv: -JUMP_STRENGTH,
    };
    while (s.y <= 0) {
      s = airStep(s, 1);
    }
    // MAX_JUMP_DISTANCE is floor()'d for conservative graph planning.
    expect(s.x).toBeGreaterThanOrEqual(MAX_JUMP_DISTANCE);
    expect(s.x).toBeLessThan(MAX_JUMP_DISTANCE + 1);
  });

  it("min launch speed is below terminal velocity", () => {
    expect(MIN_LAUNCH_SPEED).toBeLessThan(WALK_TERMINAL_VELOCITY);
    expect(MIN_LAUNCH_SPEED).toBeGreaterThan(0);
  });

  it("run-up distance from rest reaches MIN_LAUNCH_SPEED in simulation", () => {
    const distance = runUpDistanceFromRest();
    // Reproduce the loop and confirm v >= MIN_LAUNCH_SPEED was reached within `distance` pixels.
    let v = 0;
    let x = 0;
    let reached = false;
    while (x < distance + 1) {
      v = v * GROUND_FRICTION + SPEED;
      x += v;
      if (v >= MIN_LAUNCH_SPEED) {
        reached = true;
        break;
      }
    }
    expect(reached).toBe(true);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(50);
  });

  describe("requiredLaunchSpeed", () => {
    it("a steep jump with meaningful horizontal travel needs more than half walk speed", () => {
      // Office-map edge jump (252,268)->(263,246): braking to half walk speed
      // (the follower's reverse-input threshold) tops out ~20px at dx=11,
      // below the 22px the planner promised.
      expect(requiredLaunchSpeed(11, 22)).toBeGreaterThan(
        WALK_TERMINAL_VELOCITY / 2,
      );
    });

    it("never exceeds walking terminal velocity", () => {
      expect(requiredLaunchSpeed(11, 22)).toBeLessThanOrEqual(
        WALK_TERMINAL_VELOCITY,
      );
      expect(requiredLaunchSpeed(25, 1)).toBeLessThanOrEqual(
        WALK_TERMINAL_VELOCITY,
      );
    });

    it("near-vertical and downward jumps need no launch speed", () => {
      expect(requiredLaunchSpeed(0, 20)).toBe(0);
      expect(requiredLaunchSpeed(5, -10)).toBe(0);
    });

    it("verifies against faithful integration: launching at the returned speed reaches the target", () => {
      const dx = 11;
      const dyUp = 22;
      const speed = requiredLaunchSpeed(dx, dyUp);
      let s = { x: 0, y: 0, xv: speed, yv: -JUMP_STRENGTH };
      let best = -Infinity;
      let prev = s;
      for (let frame = 0; frame < 200 && s.y <= 0.5; frame++) {
        s = airStep(s, 1);
        if (prev.x <= dx && s.x >= dx) {
          const t = (dx - prev.x) / (s.x - prev.x || 1);
          best = Math.max(best, -(prev.y + t * (s.y - prev.y)));
        }
        prev = s;
      }
      // The 22px target is only reachable with the landing clamber; the
      // returned speed must get within clamber range (3px) of it.
      expect(best).toBeGreaterThanOrEqual(dyUp - 3);
    });
  });

  describe("brakingLandingOffset", () => {
    it("travels less than coasting when braking from a fast overfly", () => {
      // Office-map edge#7 overfly: apex 35px above the landing at xv ~0.9.
      const braked = brakingLandingOffset(0.9, 0, 35);
      let s = { x: 0, y: 0, xv: 0.9, yv: 0 };
      while (s.y < 35) {
        s = airStep(s, 1);
      }
      expect(braked).toBeLessThan(s.x);
      expect(braked).toBeGreaterThan(0);
    });

    it("returns ~0 when already at the landing height", () => {
      expect(Math.abs(brakingLandingOffset(0.9, 0, 0))).toBeLessThan(2);
      expect(brakingLandingOffset(0.9, 0, -10)).toBe(0);
    });

    it("matches faithful integration with the brake held", () => {
      let s = { x: 0, y: 0, xv: 1.0, yv: -1.5 };
      let expected = s.x;
      while (s.y < 20) {
        s = airStep(s, s.xv > 0 ? -1 : 0);
        expected = s.x;
      }
      expect(brakingLandingOffset(1.0, -1.5, 20)).toBeCloseTo(expected, 5);
    });
  });
});

// The reimplemented airStep above (and physics.ts itself) are hand-copies of
// body.ts's integration. These tests pin the derived constants to the REAL Body
// so that a future change to body.ts's tick can't silently drift the bot's
// jump-reach math while every other physics test stays green.
describe("physics.ts mirrors the real Body integration", () => {
  function airborneBody(launchX: number): Body {
    // An empty surface — every collision query misses — so the body flies a pure
    // ballistic arc, exactly the regime physics.ts models.
    const surface = {
      collidesWith: () => false,
    } as unknown as CollisionMask;
    const body = new Body(surface, { mask: {} as unknown as CollisionMask });
    body.yVelocity = -JUMP_STRENGTH;
    body.xVelocity = launchX;
    return body;
  }

  it("standing-jump apex frame and height match a live Body", () => {
    const body = airborneBody(0);
    let peak = 0;
    let apexFrame = 0;
    for (let frame = 1; frame <= 120; frame++) {
      body.tick(1);
      const [, y] = body.precisePosition;
      if (y < peak) {
        peak = y;
        apexFrame = frame;
      }
      if (y > 0) break;
    }
    expect(apexFrame).toBe(APEX_FRAMES);
    // MAX_JUMP_HEIGHT is floor()'d, so the live peak sits within [H, H + 1).
    expect(-peak).toBeGreaterThanOrEqual(MAX_JUMP_HEIGHT);
    expect(-peak).toBeLessThan(MAX_JUMP_HEIGHT + 1);
  });

  it("running-jump distance matches a live Body holding air-control", () => {
    const body = airborneBody(WALK_TERMINAL_VELOCITY);
    let landingX = 0;
    for (let frame = 1; frame <= 200; frame++) {
      body.walk(1);
      body.tick(1);
      const [x, y] = body.precisePosition;
      if (y > 0) {
        landingX = x;
        break;
      }
    }
    // MAX_JUMP_DISTANCE is floor()'d, so the live landing sits within [D, D + 1).
    expect(landingX).toBeGreaterThanOrEqual(MAX_JUMP_DISTANCE);
    expect(landingX).toBeLessThan(MAX_JUMP_DISTANCE + 1);
  });

  // Returns body.yVelocity (what onCollide checks for fall damage) at landing.
  function landingSpeedAfterFalling(height: number): number {
    const surface = {
      collidesWith: () => false,
    } as unknown as CollisionMask;
    const body = new Body(surface, { mask: {} as unknown as CollisionMask });
    for (let frame = 0; frame < 200; frame++) {
      body.tick(1);
      if (body.precisePosition[1] >= height) {
        return body.yVelocity;
      }
    }
    return body.yVelocity;
  }

  it("a fall of MAX_SAFE_FALL_HEIGHT lands within the safe landing speed", () => {
    expect(landingSpeedAfterFalling(MAX_SAFE_FALL_HEIGHT)).toBeLessThanOrEqual(
      SAFE_LANDING_SPEED
    );
  });

  it("a fall well past MAX_SAFE_FALL_HEIGHT exceeds the safe landing speed", () => {
    expect(
      landingSpeedAfterFalling(MAX_SAFE_FALL_HEIGHT + 12)
    ).toBeGreaterThan(SAFE_LANDING_SPEED);
  });
});
