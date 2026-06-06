import { Meteor } from "../meteor";

describe("Meteor.predictDamageAt", () => {
  it("uses explosive falloff scaled by expected near-target bounces", () => {
    // Elemental value 2 → multiplier = 5 + 1 = 6; at distance 0 predictExplosive ≈ 10*6 = 60;
    // EXPECTED_BOUNCES = 2 → ~120 at center.
    expect(Meteor.predictDamageAt(0, 2)).toBeCloseTo(120, 0);
    expect(Meteor.predictDamageAt(40, 2)).toBe(0);
  });
});
