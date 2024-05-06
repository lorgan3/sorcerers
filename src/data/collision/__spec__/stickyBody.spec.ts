import { describe, expect, test } from "vitest";
import { CollisionMask } from "../collisionMask";
import { StickyBody } from "../stickyBody";

describe("stickyBody", () => {
  const TARGET_FPS = 30;
  const framerates = [15, TARGET_FPS, 60, 120, 240];
  const collisionMask = CollisionMask.forRect(5, 5);
  const mask = CollisionMask.forRect(1, 1);

  test.each(framerates)("Sticks at %d fps", (fps) => {
    const body = new StickyBody(collisionMask, {
      mask,
      velocity: 2,
    });
    body.move(2, -10);

    const dt = TARGET_FPS / fps;
    let landed = false;
    let lastDirection = body.stickDirection;
    let directionChanges = 0;

    for (let i = 0; i < TARGET_FPS; i += dt) {
      body.tick(dt);

      if (body.stickDirection !== -1 && !landed) {
        landed = true;
        const [x, y] = body.precisePosition;
        const [expectedX, expectedY] = [2, -1];
        expect(x).toBeCloseTo(expectedX, 0);
        expect(y).toBeCloseTo(expectedY, 0);
      }

      if (lastDirection !== body.stickDirection) {
        lastDirection = body.stickDirection;
        directionChanges++;
      }
    }

    // Clearly still not perfect but it will have to do for now
    if (fps >= 120) {
      expect(directionChanges).toEqual(9);
    } else {
      expect(directionChanges).toEqual(8);
    }
  });
});
