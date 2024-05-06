import { describe, expect, test } from "vitest";
import { CollisionMask } from "../collisionMask";
import { SimpleBody } from "../simpleBody";

describe("simpleBody", () => {
  const TARGET_FPS = 30;
  const framerates = [15, TARGET_FPS, 60, 120, 240];
  const collisionMask = CollisionMask.forRect(500, 20);
  const mask = CollisionMask.forRect(1, 1);

  test.each(framerates)("Falls at %d fps", (fps) => {
    const body = new SimpleBody(collisionMask, {
      mask,
    });
    body.move(0, -150);

    const dt = TARGET_FPS / fps;
    for (let i = 0; i < TARGET_FPS; i += dt) {
      body.tick(dt);
    }

    const [x, y] = body.precisePosition;
    const [expectedX, expectedY] = [0, -15];
    expect(x).toBeCloseTo(expectedX, 0);
    expect(y).toBeCloseTo(expectedY, 0);
  });

  test.each(framerates)("Bounces at %d fps", (fps) => {
    const body = new SimpleBody(collisionMask, {
      mask,
      bounciness: -0.5,
    });
    body.move(0, -20);
    body.addAngularVelocity(5, Math.PI / 4);

    const dt = TARGET_FPS / fps;
    for (let i = 0; i < TARGET_FPS; i += dt) {
      body.tick(dt);
    }

    const [x, y] = body.precisePosition;
    const [expectedX, expectedY] = [106, -1.4];
    expect(x).toBeCloseTo(expectedX, 0);
    expect(y).toBeCloseTo(expectedY, 0);
  });
});
