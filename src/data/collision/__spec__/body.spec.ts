import { describe, expect, test } from "vitest";
import { Body } from "../body";
import { CollisionMask } from "../collisionMask";

describe("body", () => {
  const TARGET_FPS = 30;
  const framerates = [15, TARGET_FPS, 60, 120, 240];
  const collisionMask = CollisionMask.forRect(500, 10);
  const mask = CollisionMask.forRect(1, 1);

  test.each(framerates)("Runs at %d fps", (fps) => {
    const body = new Body(collisionMask, {
      mask,
    });
    body.move(0, -1);
    // @ts-expect-error
    body._grounded = true;

    const dt = TARGET_FPS / fps;
    for (let i = 0; i < TARGET_FPS; i += dt) {
      body.walk(1);
      body.tick(dt);
    }

    const [x, y] = body.precisePosition;
    const [expectedX, expectedY] = [14, -1];
    expect(x).toBeCloseTo(expectedX, 0);
    expect(y).toBeCloseTo(expectedY, 0);
  });

  test.each(framerates)("Falls at %d fps", (fps) => {
    const body = new Body(collisionMask, {
      mask,
    });
    body.move(0, -100);

    const dt = TARGET_FPS / fps;
    for (let i = 0; i < TARGET_FPS; i += dt) {
      body.tick(dt);
    }

    const [x, y] = body.precisePosition;
    const [expectedX, expectedY] = [0, -25.77];
    expect(x).toBeCloseTo(expectedX, 0);
    expect(y).toBeCloseTo(expectedY, 0);
  });

  test("Walks up a 2-pixel step", () => {
    // 100x100 surface with a 2-pixel step at x=50.
    // Ground level is y=90 for x<50, then y=88 for x>=50.
    const surface = CollisionMask.forRect(100, 100);
    // Clear everything above ground on the left side (y=0..89 for x=0..49).
    // Use two 32-aligned subtracts to avoid the lshift=32 overflow in subtract(_, 0, 0).
    surface.subtract(CollisionMask.forRect(32, 90), 0, 0); // clears x=0..31
    surface.subtract(CollisionMask.forRect(18, 90), 32, 0); // clears x=32..49
    // Clear everything above the raised ground on the right side (y=0..87 for x=50..99).
    surface.subtract(CollisionMask.forRect(50, 88), 50, 0);

    const mask = CollisionMask.forRect(1, 1);
    const body = new Body(surface, { mask });

    // Place body on the left ground, just before the step.
    body.move(45, 89);
    // @ts-expect-error - accessing private _grounded for test setup
    body._grounded = true;

    const dt = 1; // 30fps (TARGET_FPS / 30)
    // Walk right for 60 ticks — enough to reach and pass the step.
    for (let i = 0; i < 60; i++) {
      body.walk(1);
      body.tick(dt);
    }

    const [x] = body.precisePosition;
    // Body must have passed x=50 — if stuck, x will be ~49.
    expect(x).toBeGreaterThan(52);
  });

  test("Blocked by a wall taller than MAX_STEP", () => {
    // 100x100 surface with a 4-pixel step at x=50 (too tall to step up).
    // Ground at y=90 for x<50, then y=86 for x>=50.
    const surface = CollisionMask.forRect(100, 100);
    surface.subtract(CollisionMask.forRect(32, 90), 0, 0);
    surface.subtract(CollisionMask.forRect(18, 90), 32, 0);
    const clearRight = CollisionMask.forRect(50, 86);
    surface.subtract(clearRight, 50, 0);

    const mask = CollisionMask.forRect(1, 1);
    const body = new Body(surface, { mask });

    body.move(45, 89);
    // @ts-expect-error - accessing private _grounded for test setup
    body._grounded = true;

    const dt = 1;
    for (let i = 0; i < 60; i++) {
      body.walk(1);
      body.tick(dt);
    }

    const [x] = body.precisePosition;
    // Body must NOT have passed the wall.
    expect(x).toBeLessThan(50);
  });

  test("Walks up a 3-pixel step (MAX_STEP)", () => {
    // 100x100 surface with a 3-pixel step at x=50.
    // Ground at y=90 for x<50, then y=87 for x>=50.
    const surface = CollisionMask.forRect(100, 100);
    surface.subtract(CollisionMask.forRect(32, 90), 0, 0);
    surface.subtract(CollisionMask.forRect(18, 90), 32, 0);
    surface.subtract(CollisionMask.forRect(50, 87), 50, 0);

    const mask = CollisionMask.forRect(1, 1);
    const body = new Body(surface, { mask });

    body.move(45, 89);
    // @ts-expect-error - accessing private _grounded for test setup
    body._grounded = true;

    const dt = 1;
    for (let i = 0; i < 60; i++) {
      body.walk(1);
      body.tick(dt);
    }

    const [x] = body.precisePosition;
    // Body must have passed the 3-pixel step.
    expect(x).toBeGreaterThan(52);
  });
});
