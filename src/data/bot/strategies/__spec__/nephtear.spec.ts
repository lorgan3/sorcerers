import { Nephtear } from "../nephtear";

describe("Nephtear.predictDamageAt", () => {
  it("is flat power within impact radius, 0 beyond it", () => {
    // With Elemental element value 1: power = 30 * (0.7 + 0.3) = 30.
    expect(Nephtear.predictDamageAt(5, 1)).toBe(30);
    expect(Nephtear.predictDamageAt(20, 1)).toBe(0);
  });
});
