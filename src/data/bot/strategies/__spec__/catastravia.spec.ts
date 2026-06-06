import { Catastravia } from "../catastravia";

describe("Catastravia.predictDamageAt", () => {
  it("sums an expected number of small explosive hits at the target", () => {
    // per-missile center damage = predictExplosive(0, 12, 2) = 10*2 = 20.
    // EXPECTED_HITS_ON_TARGET = 3 → 60 at center.
    expect(Catastravia.predictDamageAt(0)).toBeCloseTo(60, 0);
    expect(Catastravia.predictDamageAt(30)).toBe(0);
  });
});
