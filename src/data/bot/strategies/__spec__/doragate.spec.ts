import { Doragate } from "../doragate";

describe("Doragate.predictDamageAt", () => {
  it("scales tiny explosive hits by expected pebbles", () => {
    // Arcane 1 → multiplier = 1.5 + 0.7 = 2.2; center = predictExplosive(0,4,2.2) = 10*2.2 = 22;
    // EXPECTED_PEBBLES = 2 → 44 at center.
    expect(Doragate.predictDamageAt(0, 1)).toBeCloseTo(44, 0);
    expect(Doragate.predictDamageAt(20, 1)).toBe(0); // radius 4 game units is tiny
  });
});
