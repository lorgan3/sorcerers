import {
  chooseBallisticHeading,
  simulateBallisticLanding,
  solveBallisticHeadings,
} from "../ballistics";
import { CollisionMask } from "../../../collision/collisionMask";

function emptyMask(w: number, h: number): CollisionMask {
  const m = CollisionMask.forRect(w, h);
  m.subtract(CollisionMask.forRect(w, h), 0, 0);
  return m;
}

describe("ballistics", () => {
  it("solves headings whose simulated arc lands on the target", () => {
    const mask = emptyMask(300, 200);
    mask.add(CollisionMask.forRect(300, 10), 0, 190); // flat ground
    const from: [number, number] = [50, 180];
    const target: [number, number] = [120, 190];

    const headings = solveBallisticHeadings(
      target[0] - from[0],
      target[1] - from[1],
      1.8,
      0.04,
    );
    expect(headings).toHaveLength(2);
    for (const heading of headings) {
      const landing = simulateBallisticLanding(mask, from, heading, 1.8, 0.04, 400)!;
      expect(Math.abs(landing[0] - target[0])).toBeLessThan(10);
    }
  });

  it("returns no headings beyond ballistic reach", () => {
    expect(solveBallisticHeadings(200, 0, 1.8, 0.04)).toHaveLength(0);
  });

  it("picks the landing closest to the target", () => {
    const mask = emptyMask(300, 200);
    mask.add(CollisionMask.forRect(300, 10), 0, 190);
    const best = chooseBallisticHeading(
      mask,
      [50, 180],
      [120, 190],
      1.8,
      0.04,
      400,
      15,
    )!;
    expect(best).not.toBeNull();
    expect(Math.hypot(best.landingGame[0] - 120, best.landingGame[1] - 190)).toBeLessThan(6);
  });
});
