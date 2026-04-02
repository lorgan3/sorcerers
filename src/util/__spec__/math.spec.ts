import {
  mod,
  dot,
  getRayDistance,
  getSquareDistance,
  getDistance,
  getAngle,
  map,
  angleDiff,
} from "../math";

describe("math", () => {
  describe("mod", () => {
    it("returns value within range for positive input", () => {
      expect(mod(3, 5)).toBe(3);
    });

    it("wraps negative values correctly", () => {
      expect(mod(-1, 5)).toBe(4);
      expect(mod(-6, 5)).toBe(4);
    });

    it("returns 0 when value equals modulo", () => {
      expect(mod(5, 5)).toBe(0);
    });

    it("wraps large values", () => {
      expect(mod(13, 5)).toBe(3);
    });
  });

  describe("dot", () => {
    it("returns 0 for orthogonal vectors", () => {
      expect(dot(1, 0, 0, 1)).toBe(0);
    });

    it("returns product for parallel vectors", () => {
      expect(dot(3, 0, 4, 0)).toBe(12);
    });

    it("computes correctly for arbitrary vectors", () => {
      expect(dot(2, 3, 4, 5)).toBe(2 * 4 + 3 * 5);
    });
  });

  describe("getRayDistance", () => {
    it("returns distance for point behind the ray origin", () => {
      // Ray at (10, 0) pointing right, point at (0, 5)
      // v1 = (10-0, 0-5) = (10, -5), v2 = (1, 0), dot = 10 > 0 → not infinity
      const dist = getRayDistance(10, 0, 0, 0, 5);
      expect(dist).toBeCloseTo(5, 5);
    });

    it("returns POSITIVE_INFINITY for point in front of the ray", () => {
      // Ray at origin pointing right, point at (5, 0) is ahead
      expect(getRayDistance(0, 0, 0, 5, 0)).toBe(Number.POSITIVE_INFINITY);
    });

    it("returns 0 for point directly on the ray line behind origin", () => {
      // Ray at (10, 0) pointing right, point at (0, 0)
      const dist = getRayDistance(10, 0, 0, 0, 0);
      expect(dist).toBeCloseTo(0, 5);
    });

    it("works with angled rays", () => {
      // Ray at (0, 10) pointing up (negative y), point at (5, 20)
      // v1 = (0-5, 10-20) = (-5, -10), v2 = (cos(-PI/2), sin(-PI/2)) = (0, -1)
      // dot = 0 + 10 = 10 > 0
      const dist = getRayDistance(0, 10, -Math.PI / 2, 5, 20);
      expect(dist).toBeCloseTo(5, 5);
    });
  });

  describe("getSquareDistance", () => {
    it("returns 0 for same point", () => {
      expect(getSquareDistance(3, 4, 3, 4)).toBe(0);
    });

    it("returns squared distance for 3-4-5 triangle", () => {
      expect(getSquareDistance(0, 0, 3, 4)).toBe(25);
    });
  });

  describe("getDistance", () => {
    it("returns 0 for same point", () => {
      expect(getDistance(0, 0, 0, 0)).toBe(0);
    });

    it("returns 5 for 3-4-5 triangle", () => {
      expect(getDistance(0, 0, 3, 4)).toBe(5);
    });

    it("handles negative coordinates", () => {
      expect(getDistance(-3, -4, 0, 0)).toBe(5);
    });
  });

  describe("getAngle", () => {
    it("returns 0 for point directly to the right", () => {
      expect(getAngle(0, 0, 1, 0)).toBe(0);
    });

    it("returns PI/2 for point directly below", () => {
      expect(getAngle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2, 5);
    });

    it("returns PI for point directly to the left", () => {
      expect(getAngle(0, 0, -1, 0)).toBeCloseTo(Math.PI, 5);
    });

    it("returns -PI/2 for point directly above", () => {
      expect(getAngle(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2, 5);
    });
  });

  describe("map", () => {
    it("returns from when t=0", () => {
      expect(map(10, 20, 0)).toBe(10);
    });

    it("returns to when t=1", () => {
      expect(map(10, 20, 1)).toBe(20);
    });

    it("returns midpoint when t=0.5", () => {
      expect(map(10, 20, 0.5)).toBe(15);
    });

    it("extrapolates beyond range", () => {
      expect(map(10, 20, 2)).toBe(30);
    });
  });

  describe("angleDiff", () => {
    it("returns 0 for same angle", () => {
      expect(angleDiff(1, 1)).toBeCloseTo(0, 5);
    });

    it("returns positive for clockwise difference", () => {
      expect(angleDiff(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
    });

    it("wraps across PI boundary correctly", () => {
      // From just below PI to just above -PI should be a small positive step
      const diff = angleDiff(Math.PI - 0.1, -Math.PI + 0.1);
      expect(diff).toBeCloseTo(0.2, 5);
    });

    it("returns negative for counter-clockwise difference", () => {
      expect(angleDiff(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2, 5);
    });
  });
});
