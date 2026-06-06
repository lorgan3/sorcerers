import { chooseGuidanceHeading } from "../guidanceHeading";
import { CollisionMask } from "../../../collision/collisionMask";

function emptyMask(w: number, h: number): CollisionMask {
  const m = CollisionMask.forRect(w, h);
  m.subtract(CollisionMask.forRect(w, h), 0, 0);
  return m;
}

describe("chooseGuidanceHeading", () => {
  it("aims straight at the target when the path is clear", () => {
    const mask = emptyMask(200, 200);
    const h = chooseGuidanceHeading(mask, [10, 100], [190, 100], 40);
    expect(Math.abs(h)).toBeLessThan(0.2); // ~0 rad = straight right
  });

  it("steers off the direct line when a wall blocks it", () => {
    const mask = emptyMask(200, 200);
    // A wall stub at game x=40 (within the 40-unit lookahead from x=10) that
    // blocks the flat direct line but leaves clearance above for a deflected ray.
    mask.add(CollisionMask.forRect(1, 60), 40, 90);
    const h = chooseGuidanceHeading(mask, [10, 100], [190, 100], 40);
    // Clearance is above the wall, so it must steer upward (negative heading).
    expect(h).toBeLessThan(0);
  });
});
