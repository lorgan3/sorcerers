import { describe, expect, it } from "vitest";
import { Zoltraak } from "../zoltraak";

// BEAM_LENGTH_SCREEN = 912, BEAM_HALF_WIDTH_SCREEN = 48 (from zoltraak.ts).
// Tests use screen-px coordinates.
describe("Zoltraak.isOnBeam", () => {
  const from: [number, number] = [0, 0];

  it("hits a point directly on a horizontal beam", () => {
    expect(Zoltraak.isOnBeam(from, [100, 0], [50, 0])).toBe(true);
  });

  it("hits a point within the half-width perpendicular to the beam", () => {
    // Beam aimed right, point 40px above the line at t=50 — within 48 half-width.
    expect(Zoltraak.isOnBeam(from, [100, 0], [50, 40])).toBe(true);
  });

  it("misses a point beyond the half-width", () => {
    // 49px above the beam line — just past the threshold.
    expect(Zoltraak.isOnBeam(from, [100, 0], [50, 49])).toBe(false);
  });

  it("misses a point behind the caster (negative t)", () => {
    // Beam aimed right, point on the line but to the left of `from`.
    expect(Zoltraak.isOnBeam(from, [100, 0], [-10, 0])).toBe(false);
  });

  it("misses a point past the beam's max range", () => {
    // Just past 912px range along the beam direction.
    expect(Zoltraak.isOnBeam(from, [100, 0], [913, 0])).toBe(false);
  });

  it("hits a point at the far end of the beam (t = BEAM_LENGTH)", () => {
    expect(Zoltraak.isOnBeam(from, [100, 0], [912, 0])).toBe(true);
  });

  it("respects the aim direction (diagonal beam)", () => {
    // Beam aimed at (100,100). Point on that line at midway is on the beam.
    expect(Zoltraak.isOnBeam(from, [100, 100], [50, 50])).toBe(true);
    // Symmetric point on the OTHER side of `from` is not.
    expect(Zoltraak.isOnBeam(from, [100, 100], [-50, -50])).toBe(false);
  });

  it("returns false when aim is degenerate (from === aimedAt)", () => {
    expect(Zoltraak.isOnBeam(from, [0, 0], [10, 0])).toBe(false);
  });
});
