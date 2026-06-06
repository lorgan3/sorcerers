import { Hairpin } from "../hairpin";

describe("Hairpin.predictDamageAt", () => {
  it("scales explosive falloff by expected landed bombs and Elemental value", () => {
    // Elemental 1 → multiplier = 5*(0.7+0.3) = 5; center = predictExplosive(0,16,5) = 10*5 = 50;
    // EXPECTED_BOMBS = 2 → 100 at center.
    expect(Hairpin.predictDamageAt(0, 1)).toBeCloseTo(100, 0);
    expect(Hairpin.predictDamageAt(40, 1)).toBe(0);
  });
});
