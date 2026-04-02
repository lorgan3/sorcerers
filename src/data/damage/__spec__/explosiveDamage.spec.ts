import { describe, it, expect, vi } from "vitest";
import { ExplosiveDamage } from "../explosiveDamage";
import { HurtableEntity } from "../../entity/types";
import { Level } from "../../map/level";

function createMockEntity(
  id: number,
  center: [number, number]
): HurtableEntity {
  return {
    id,
    hp: 100,
    getCenter: () => center,
    damage: vi.fn(),
    die: vi.fn(),
    body: { mask: {} },
  } as unknown as HurtableEntity;
}

describe("ExplosiveDamage", () => {
  describe("getTargets", () => {
    it("finds nearby hurtable entities and calculates damage", () => {
      const entity = createMockEntity(1, [60, 60]);

      const withNearbyEntities: Level["withNearbyEntities"] = (
        x,
        y,
        range,
        fn
      ) => {
        fn(entity, 10);
      };

      const damage = new ExplosiveDamage(10, 10, 16, 5, 5);
      const targets = damage.getTargets(withNearbyEntities);

      expect(targets.hasEntities()).toBe(true);
    });

    it("calculates higher damage for closer entities", () => {
      const closeEntity = createMockEntity(1, [66, 60]);
      const farEntity = createMockEntity(2, [180, 180]);

      const withNearbyEntities: Level["withNearbyEntities"] = (
        x,
        y,
        range,
        fn
      ) => {
        fn(closeEntity, 10);
        fn(farEntity, range - 1);
      };

      const damage = new ExplosiveDamage(10, 10, 16, 5, 5);
      const targets = damage.getTargets(withNearbyEntities);
      const serialized = targets.serialize();

      // Closer entity should receive more damage than farther entity
      const closeDamage = serialized[0][1];
      const farDamage = serialized[1][1];
      expect(closeDamage).toBeGreaterThan(farDamage);
    });

    it("ignores non-hurtable entities", () => {
      const nonHurtable = { position: { x: 60, y: 60 } };

      const withNearbyEntities: Level["withNearbyEntities"] = (
        x,
        y,
        range,
        fn
      ) => {
        fn(nonHurtable as any, 10);
      };

      const damage = new ExplosiveDamage(10, 10, 16, 5, 5);
      const targets = damage.getTargets(withNearbyEntities);

      expect(targets.hasEntities()).toBe(false);
    });

    it("caches targets on subsequent calls", () => {
      const withNearbyEntities = vi.fn() as unknown as Level["withNearbyEntities"];

      const damage = new ExplosiveDamage(10, 10, 16, 5, 5);
      const targets1 = damage.getTargets(withNearbyEntities);
      const targets2 = damage.getTargets(withNearbyEntities);

      expect(targets1).toBe(targets2);
      expect(withNearbyEntities).toHaveBeenCalledTimes(1);
    });

    it("applies damage multiplier to damage values", () => {
      const entity = createMockEntity(1, [66, 60]);

      const withNearbyEntities: Level["withNearbyEntities"] = (
        x,
        y,
        range,
        fn
      ) => {
        fn(entity, 0);
      };

      const lowMultiplier = new ExplosiveDamage(10, 10, 16, 5, 1);
      const highMultiplier = new ExplosiveDamage(10, 10, 16, 5, 10);

      const lowTargets = lowMultiplier.getTargets(withNearbyEntities);
      const highTargets = highMultiplier.getTargets(withNearbyEntities);

      const lowDamage = lowTargets.serialize()[0][1];
      const highDamage = highTargets.serialize()[0][1];

      expect(highDamage).toBe(lowDamage * 10);
    });

    it("sets force direction toward the entity from explosion center", () => {
      // Entity directly to the right of explosion
      const entity = createMockEntity(1, [120, 60]);

      const withNearbyEntities: Level["withNearbyEntities"] = (
        x,
        y,
        range,
        fn
      ) => {
        fn(entity, 30);
      };

      const damage = new ExplosiveDamage(10, 10, 16, 5, 5);
      const targets = damage.getTargets(withNearbyEntities);
      const serialized = targets.serialize();

      // Direction should be approximately 0 (pointing right)
      // atan2(60 - 60, 120 - 60) = atan2(0, 60) = 0
      const direction = serialized[0][3];
      expect(direction).toBeCloseTo(0, 1);
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips without targets", () => {
      const damage = new ExplosiveDamage(10, 20, 16);
      const serialized = damage.serialize();

      expect(serialized[0]).toBe(10);
      expect(serialized[1]).toBe(20);
      expect(serialized[2]).toBe(16);
    });

    it("preserves position and range through deserialization", () => {
      const original = new ExplosiveDamage(15, 25, 8);
      const serialized = original.serialize();
      const restored = ExplosiveDamage.deserialize(serialized);

      expect(restored.x).toBe(15);
      expect(restored.y).toBe(25);
      expect(restored.serialize()[2]).toBe(8);
    });
  });
});
