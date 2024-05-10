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
});
