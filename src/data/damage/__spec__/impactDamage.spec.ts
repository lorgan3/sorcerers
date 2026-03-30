import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ImpactDamage } from "../impactDamage";
import { TargetList } from "../targetList";
import { DamageSourceType } from "../types";
import { HurtableEntity } from "../../entity/types";
import {
  installMockContext,
  clearMockContext,
  MockLevel,
} from "../../__spec__/mockContext";
import { CollisionMask } from "../../collision/collisionMask";

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
    body: { mask: CollisionMask.forRect(3, 3) },
  } as unknown as HurtableEntity;
}

describe("ImpactDamage", () => {
  it("has type Impact", () => {
    const damage = new ImpactDamage(10, 20, 0, 5);
    expect(damage.type).toBe(DamageSourceType.Impact);
  });

  it("has null cause by default", () => {
    const damage = new ImpactDamage(10, 20, 0, 5);
    expect(damage.cause).toBeNull();
  });

  it("stores position", () => {
    const damage = new ImpactDamage(15, 25, 0, 5);
    expect(damage.x).toBe(15);
    expect(damage.y).toBe(25);
  });

  describe("serialize / deserialize", () => {
    it("serializes position", () => {
      const damage = new ImpactDamage(10, 20, Math.PI, 5);
      const serialized = damage.serialize();
      expect(serialized[0]).toBe(10);
      expect(serialized[1]).toBe(20);
    });

    it("preserves position through deserialization", () => {
      const original = new ImpactDamage(15, 25, 0, 0);
      const serialized = original.serialize();
      const restored = ImpactDamage.deserialize(serialized);
      expect(restored.x).toBe(15);
      expect(restored.y).toBe(25);
    });

    it("round-trips with pre-computed targets", () => {
      const entity = createMockEntity(1, [60, 60]);
      const targets = new TargetList();
      targets.add(entity, 10, { power: 1, direction: 0 });

      const original = new ImpactDamage(10, 20, 0, 5, targets);
      const serialized = original.serialize();
      const restored = ImpactDamage.deserialize(serialized);

      expect(restored.getTargets().hasEntities()).toBe(true);
    });
  });

  describe("getTargets", () => {
    let level: MockLevel;

    beforeEach(() => {
      const mocks = installMockContext();
      level = mocks.level;
    });

    afterEach(() => {
      clearMockContext();
    });

    it("calls withNearbyEntities with correct search area", () => {
      level.withNearbyEntities.mockImplementation(() => {});

      const damage = new ImpactDamage(10, 20, 0, 15);
      damage.getTargets();

      expect(level.withNearbyEntities).toHaveBeenCalledWith(
        (10 + 3) * 6, // x offset
        (20 + 8) * 6, // y offset
        16 * 6, // range
        expect.any(Function)
      );
    });

    it("ignores non-hurtable entities", () => {
      const nonHurtable = { position: { x: 60, y: 60 } };

      level.withNearbyEntities.mockImplementation(
        (x: number, y: number, range: number, fn: Function) => {
          fn(nonHurtable, 10);
        }
      );

      const damage = new ImpactDamage(10, 20, 0, 15);
      const targets = damage.getTargets();
      expect(targets.hasEntities()).toBe(false);
    });

    it("caches targets on subsequent calls", () => {
      level.withNearbyEntities.mockImplementation(() => {});

      const damage = new ImpactDamage(10, 20, 0, 15);
      const targets1 = damage.getTargets();
      const targets2 = damage.getTargets();
      expect(targets1).toBe(targets2);
      expect(level.withNearbyEntities).toHaveBeenCalledTimes(1);
    });

    it("uses pre-computed targets when provided", () => {
      const targets = new TargetList();
      const damage = new ImpactDamage(10, 20, 0, 15, targets);
      expect(damage.getTargets()).toBe(targets);
      expect(level.withNearbyEntities).not.toHaveBeenCalled();
    });

    it("uses pre-computed targets with correct power and direction", () => {
      const entity = createMockEntity(1, [60, 60]);
      const direction = Math.PI / 4;
      const power = 20;

      const targets = new TargetList();
      targets.add(entity, power, {
        power: power / 10,
        direction,
      });

      const damage = new ImpactDamage(10, 20, direction, power, targets);
      const result = damage.getTargets();
      const serialized = result.serialize();

      expect(serialized[0][1]).toBe(power);
      expect(serialized[0][2]).toBe(power / 10);
      expect(serialized[0][3]).toBe(direction);
    });
  });
});
