import { Lightning } from "../lightning";

describe("Lightning.predictPerTarget", () => {
  it("is 20 + 5 per Elemental element value", () => {
    expect(Lightning.predictPerTarget(0)).toBe(20);
    expect(Lightning.predictPerTarget(2)).toBe(30);
  });
});
