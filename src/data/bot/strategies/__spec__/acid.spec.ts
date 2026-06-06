import { Acid } from "../acid";

describe("Acid.predictDamageAt", () => {
  it("scales flat droplet damage by expected droplets within Acid range", () => {
    // Life 1 → per-droplet = 3 + 1 = 4; EXPECTED_DROPLETS = 4 → 16 within range (90px = 15 game units)
    expect(Acid.predictDamageAt(10, 1)).toBe(16);
    expect(Acid.predictDamageAt(20, 1)).toBe(0);
  });
});
