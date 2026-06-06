import { ArthurSword } from "../arthurSword";

describe("ArthurSword.predictDamageAt", () => {
  it("counts EXPECTED_HITS flat fall-damage hits within range", () => {
    // Arcane value 1 → per-hit power = 2 + 2 = 4; EXPECTED_HITS = 3 → 12 within range
    expect(ArthurSword.predictDamageAt(5, 1)).toBe(12);
    // beyond SwordTip range (80px ≈ 13.3 game units)
    expect(ArthurSword.predictDamageAt(20, 1)).toBe(0);
  });
});
