import { Babylon } from "../babylon";

describe("Babylon.predictDamageAt", () => {
  it("applies flat 8-damage hits within range, scaled by EXPECTED_HITS", () => {
    // EXPECTED_HITS = 4 → 32 within range, 0 outside SmallSword range (30px ≈ 5 game units)
    expect(Babylon.predictDamageAt(3)).toBe(32);
    expect(Babylon.predictDamageAt(10)).toBe(0);
  });
});
