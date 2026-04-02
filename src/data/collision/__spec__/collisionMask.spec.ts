import { CollisionMask } from "../collisionMask";

describe("CollisionMask", () => {
  describe("forRect", () => {
    it("creates a mask with correct dimensions", () => {
      const mask = CollisionMask.forRect(10, 5);
      expect(mask.width).toBe(10);
      expect(mask.height).toBe(5);
    });

    it("creates a 1x1 mask", () => {
      const mask = CollisionMask.forRect(1, 1);
      expect(mask.width).toBe(1);
      expect(mask.height).toBe(1);
      expect(mask.collidesWithPoint(0, 0)).toBe(true);
    });

    it("creates a mask wider than 32 bits", () => {
      const mask = CollisionMask.forRect(64, 2);
      expect(mask.width).toBe(64);
      expect(mask.collidesWithPoint(0, 0)).toBe(true);
      expect(mask.collidesWithPoint(63, 1)).toBe(true);
    });

    it("fills all pixels within the rect", () => {
      const mask = CollisionMask.forRect(8, 4);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 8; x++) {
          expect(mask.collidesWithPoint(x, y)).toBe(true);
        }
      }
    });
  });

  describe("collidesWithPoint", () => {
    it("returns true for a point inside a filled mask", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(5, 5)).toBe(true);
    });

    it("returns false for negative x", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(-1, 5)).toBe(false);
    });

    it("returns false for negative y", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(5, -1)).toBe(false);
    });

    it("returns true at x=0, y=0", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(0, 0)).toBe(true);
    });

    it("returns true at max boundary", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(9, 9)).toBe(true);
    });

    it("returns false at x=width", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(10, 5)).toBe(false);
    });

    it("returns false at y=height", () => {
      const mask = CollisionMask.forRect(10, 10);
      expect(mask.collidesWithPoint(5, 10)).toBe(false);
    });

    it("detects cleared bits after subtract", () => {
      const big = CollisionMask.forRect(10, 10);
      const small = CollisionMask.forRect(2, 2);
      big.subtract(small, 3, 3);
      expect(big.collidesWithPoint(3, 3)).toBe(false);
      expect(big.collidesWithPoint(4, 4)).toBe(false);
      expect(big.collidesWithPoint(5, 5)).toBe(true);
    });
  });

  describe("collidesWith", () => {
    it("detects collision for overlapping masks", () => {
      const a = CollisionMask.forRect(10, 10);
      const b = CollisionMask.forRect(10, 10);
      expect(a.collidesWith(b, 0, 0)).toBe(true);
    });

    it("returns false for non-overlapping masks (x)", () => {
      const a = CollisionMask.forRect(5, 5);
      const b = CollisionMask.forRect(5, 5);
      expect(a.collidesWith(b, 10, 0)).toBe(false);
    });

    it("returns false for non-overlapping masks (y)", () => {
      const a = CollisionMask.forRect(5, 5);
      const b = CollisionMask.forRect(5, 5);
      expect(a.collidesWith(b, 0, 10)).toBe(false);
    });

    it("detects partial overlap", () => {
      const a = CollisionMask.forRect(10, 10);
      const b = CollisionMask.forRect(10, 10);
      expect(a.collidesWith(b, 5, 5)).toBe(true);
    });

    it("handles negative dx by swapping", () => {
      const a = CollisionMask.forRect(10, 10);
      const b = CollisionMask.forRect(10, 10);
      expect(a.collidesWith(b, -5, 0)).toBe(true);
    });

    it("handles negative dy (other above)", () => {
      const a = CollisionMask.forRect(10, 10);
      const b = CollisionMask.forRect(10, 10);
      expect(a.collidesWith(b, 0, -5)).toBe(true);
    });

    it("returns false when dx exceeds width", () => {
      const a = CollisionMask.forRect(5, 5);
      const b = CollisionMask.forRect(5, 5);
      expect(a.collidesWith(b, 6, 0)).toBe(false);
    });

    it("returns false when other is completely above", () => {
      const a = CollisionMask.forRect(5, 5);
      const b = CollisionMask.forRect(5, 5);
      expect(a.collidesWith(b, 0, -6)).toBe(false);
    });

    it("detects collision with 1x1 masks at same position", () => {
      const a = CollisionMask.forRect(1, 1);
      const b = CollisionMask.forRect(1, 1);
      expect(a.collidesWith(b, 0, 0)).toBe(true);
    });

    it("works with masks wider than 32 pixels", () => {
      const a = CollisionMask.forRect(64, 10);
      const b = CollisionMask.forRect(10, 10);
      expect(a.collidesWith(b, 50, 0)).toBe(true);
    });
  });

  describe("add", () => {
    it("sets bits in the target mask", () => {
      const target = CollisionMask.forRect(10, 10);
      target.subtract(CollisionMask.forRect(10, 10), 0, 0); // clear all
      const small = CollisionMask.forRect(3, 3);
      target.add(small, 2, 2);
      expect(target.collidesWithPoint(2, 2)).toBe(true);
      expect(target.collidesWithPoint(4, 4)).toBe(true);
    });

    it("does not affect bits outside the added region", () => {
      const target = CollisionMask.forRect(10, 10);
      target.subtract(CollisionMask.forRect(10, 10), 0, 0); // clear all
      const small = CollisionMask.forRect(2, 2);
      target.add(small, 5, 5);
      expect(target.collidesWithPoint(0, 0)).toBe(false);
      expect(target.collidesWithPoint(5, 5)).toBe(true);
    });

    it("is cumulative", () => {
      const target = CollisionMask.forRect(10, 10);
      target.subtract(CollisionMask.forRect(10, 10), 0, 0);
      const dot = CollisionMask.forRect(1, 1);
      target.add(dot, 0, 0);
      target.add(dot, 9, 9);
      expect(target.collidesWithPoint(0, 0)).toBe(true);
      expect(target.collidesWithPoint(9, 9)).toBe(true);
      expect(target.collidesWithPoint(5, 5)).toBe(false);
    });
  });

  describe("subtract", () => {
    it("clears bits in the target mask", () => {
      const target = CollisionMask.forRect(10, 10);
      const hole = CollisionMask.forRect(2, 2);
      target.subtract(hole, 4, 4);
      expect(target.collidesWithPoint(4, 4)).toBe(false);
      expect(target.collidesWithPoint(5, 5)).toBe(false);
    });

    it("does not affect bits outside the subtracted region", () => {
      const target = CollisionMask.forRect(10, 10);
      const hole = CollisionMask.forRect(2, 2);
      target.subtract(hole, 4, 4);
      expect(target.collidesWithPoint(0, 0)).toBe(true);
      expect(target.collidesWithPoint(9, 9)).toBe(true);
    });

    it("subtracting from empty is no-op", () => {
      const target = CollisionMask.forRect(10, 10);
      target.subtract(CollisionMask.forRect(10, 10), 0, 0);
      target.subtract(CollisionMask.forRect(5, 5), 2, 2); // subtract again
      expect(target.collidesWithPoint(3, 3)).toBe(false); // still clear
    });
  });

  describe("difference", () => {
    it("returns empty mask for identical overlap", () => {
      const a = CollisionMask.forRect(8, 8);
      const b = CollisionMask.forRect(8, 8);
      const diff = a.difference(b, 0, 0);
      // All bits of b are covered by a, so difference should be empty
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          expect(diff.collidesWithPoint(x, y)).toBe(false);
        }
      }
    });

    it("returns full other mask when no overlap", () => {
      const a = CollisionMask.forRect(5, 5);
      a.subtract(CollisionMask.forRect(5, 5), 0, 0); // empty mask
      const b = CollisionMask.forRect(5, 5);
      const diff = a.difference(b, 0, 0);
      expect(diff.collidesWithPoint(0, 0)).toBe(true);
      expect(diff.collidesWithPoint(4, 4)).toBe(true);
    });

    it("has correct dimensions matching other mask", () => {
      const a = CollisionMask.forRect(20, 20);
      const b = CollisionMask.forRect(5, 5);
      const diff = a.difference(b, 3, 3);
      expect(diff.width).toBe(5);
      expect(diff.height).toBe(5);
    });
  });

  describe("clone", () => {
    it("has same dimensions", () => {
      const original = CollisionMask.forRect(15, 20);
      const cloned = original.clone();
      expect(cloned.width).toBe(15);
      expect(cloned.height).toBe(20);
    });

    it("has identical collision behavior", () => {
      const original = CollisionMask.forRect(10, 10);
      const hole = CollisionMask.forRect(2, 2);
      original.subtract(hole, 3, 3);
      const cloned = original.clone();
      expect(cloned.collidesWithPoint(0, 0)).toBe(true);
      expect(cloned.collidesWithPoint(3, 3)).toBe(false);
    });

    it("is independent — modifying clone does not affect original", () => {
      const original = CollisionMask.forRect(10, 10);
      const cloned = original.clone();
      cloned.subtract(CollisionMask.forRect(10, 10), 0, 0);
      expect(original.collidesWithPoint(5, 5)).toBe(true);
      expect(cloned.collidesWithPoint(5, 5)).toBe(false);
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips dimensions", () => {
      const original = CollisionMask.forRect(15, 20);
      const serialized = original.serialize();
      const restored = CollisionMask.deserialize({
        width: serialized.width,
        height: serialized.height,
        mask: serialized.mask.map((buf) => new Uint8Array(buf)),
      });
      expect(restored.width).toBe(15);
      expect(restored.height).toBe(20);
    });

    it("round-trips collision behavior", () => {
      const original = CollisionMask.forRect(10, 10);
      original.subtract(CollisionMask.forRect(2, 2), 4, 4);

      const serialized = original.serialize();
      const restored = CollisionMask.deserialize({
        width: serialized.width,
        height: serialized.height,
        mask: serialized.mask.map((buf) => new Uint8Array(buf)),
      });

      expect(restored.collidesWithPoint(0, 0)).toBe(true);
      expect(restored.collidesWithPoint(4, 4)).toBe(false);
      expect(restored.collidesWithPoint(9, 9)).toBe(true);
    });
  });

  describe("fromAlpha", () => {
    it("sets bits for pixels with alpha > 128", () => {
      const data = {
        width: 4,
        height: 1,
        data: new Uint8ClampedArray([
          0, 0, 0, 255, // alpha 255 → set
          0, 0, 0, 0, // alpha 0 → unset
          0, 0, 0, 129, // alpha 129 → set
          0, 0, 0, 128, // alpha 128 → unset
        ]),
      } as unknown as ImageData;

      const mask = CollisionMask.fromAlpha(data);
      expect(mask.collidesWithPoint(0, 0)).toBe(true);
      expect(mask.collidesWithPoint(1, 0)).toBe(false);
      expect(mask.collidesWithPoint(2, 0)).toBe(true);
      expect(mask.collidesWithPoint(3, 0)).toBe(false);
    });
  });

  describe("fromColor", () => {
    it("sets bits for pixels with red channel = 0", () => {
      const data = {
        width: 3,
        height: 1,
        data: new Uint8ClampedArray([
          0, 255, 255, 255, // red 0 → set
          255, 0, 0, 255, // red 255 → unset
          0, 0, 0, 0, // red 0 → set
        ]),
      } as unknown as ImageData;

      const mask = CollisionMask.fromColor(data);
      expect(mask.collidesWithPoint(0, 0)).toBe(true);
      expect(mask.collidesWithPoint(1, 0)).toBe(false);
      expect(mask.collidesWithPoint(2, 0)).toBe(true);
    });
  });
});
