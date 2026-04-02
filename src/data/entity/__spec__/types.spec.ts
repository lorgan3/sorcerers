import {
  isHurtableEntity,
  isSpawnableEntity,
  isSyncableEntity,
  isItem,
} from "../types";

describe("entity type guards", () => {
  describe("isHurtableEntity", () => {
    it("returns true for objects with getCenter", () => {
      expect(isHurtableEntity({ getCenter: () => [0, 0] })).toBe(true);
    });

    it("returns false for objects without getCenter", () => {
      expect(isHurtableEntity({ hp: 100 })).toBe(false);
    });

    it("returns false for empty objects", () => {
      expect(isHurtableEntity({})).toBe(false);
    });
  });

  describe("isSpawnableEntity", () => {
    it("returns true for objects with serializeCreate", () => {
      const entity = { serializeCreate: () => [] };
      expect(isSpawnableEntity(entity as any)).toBe(true);
    });

    it("returns false for objects without serializeCreate", () => {
      expect(isSpawnableEntity({ id: 1 } as any)).toBe(false);
    });
  });

  describe("isSyncableEntity", () => {
    it("returns true for objects with priority", () => {
      expect(isSyncableEntity({ priority: 0 } as any)).toBe(true);
    });

    it("returns false for objects without priority", () => {
      expect(isSyncableEntity({ id: 1 } as any)).toBe(false);
    });
  });

  describe("isItem", () => {
    it("returns true for objects with activate", () => {
      expect(isItem({ activate: () => {} } as any)).toBe(true);
    });

    it("returns false for objects without activate", () => {
      expect(isItem({ hp: 100 } as any)).toBe(false);
    });
  });
});
