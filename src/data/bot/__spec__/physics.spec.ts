import { describe, expect, it } from "vitest";
import {
  AIRTIME_FRAMES,
  APEX_FRAMES,
  MAX_JUMP_DISTANCE,
  MAX_JUMP_HEIGHT,
  MIN_LAUNCH_SPEED,
  WALK_TERMINAL_VELOCITY,
  runUpDistanceFromRest,
} from "../physics";

// These mirror the constants in body.ts. If body.ts is retuned, both these constants
// and the values in physics.ts need to be updated. The "real" tests simulate the
// integration to verify the derivations are consistent.
const GRAVITY = 0.2;
const JUMP_STRENGTH = 3.3;
const SPEED = 0.08;
const GROUND_FRICTION = 0.88;
const AIR_FRICTION = 0.98;
const AIR_CONTROL = 0.3;

describe("physics", () => {
  it("walking terminal velocity matches simulation", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) {
      v = v * GROUND_FRICTION + SPEED;
    }
    expect(WALK_TERMINAL_VELOCITY).toBeCloseTo(v, 3);
  });

  it("apex frames is the integer time when yVelocity reaches zero", () => {
    let yv = -JUMP_STRENGTH;
    let frames = 0;
    while (yv < 0) {
      yv += GRAVITY;
      frames++;
    }
    // The closed-form APEX_FRAMES (16.5) lies between consecutive integer frame counts.
    expect(APEX_FRAMES).toBeGreaterThan(frames - 1);
    expect(APEX_FRAMES).toBeLessThan(frames + 1);
  });

  it("max jump height is achievable in simulation (no horizontal motion)", () => {
    let yv = -JUMP_STRENGTH;
    let y = 0;
    let minY = 0;
    for (let i = 0; i < Math.ceil(AIRTIME_FRAMES); i++) {
      y += yv + GRAVITY * 0.5; // yDiff = vy*dt + g*dt^2/2 (dt=1)
      yv += GRAVITY;
      if (y < minY) minY = y;
    }
    // minY (most negative) corresponds to peak height (up is negative y).
    expect(Math.abs(minY)).toBeGreaterThanOrEqual(MAX_JUMP_HEIGHT - 1);
  });

  it("max jump distance is approximately reachable from running launch", () => {
    // Simulate: launch at WALK_TERMINAL_VELOCITY, hold air-control direction +1.
    let xv = WALK_TERMINAL_VELOCITY;
    let yv = -JUMP_STRENGTH;
    let x = 0;
    let y = 0;
    let frames = 0;
    while (y <= 0 && frames < 100) {
      const yDiff = yv + GRAVITY * 0.5;
      const xAcc = AIR_CONTROL * SPEED;
      const xDiff = xv + xAcc * 0.5;
      x += xDiff;
      y += yDiff;
      xv = xv * AIR_FRICTION + xAcc;
      yv += GRAVITY;
      frames++;
    }
    // Simulated distance should be within 30% of our MAX_JUMP_DISTANCE estimate.
    // (The estimate uses a fudge factor of 0.7; this test verifies it's in the right ballpark.)
    expect(x).toBeGreaterThan(MAX_JUMP_DISTANCE * 0.7);
    expect(x).toBeLessThan(MAX_JUMP_DISTANCE * 1.3);
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
});
