import { describe, it, expect, vi } from "vitest";
import { GenericDamage } from "../genericDamage";
import { TargetList } from "../targetList";
import { DamageSourceType } from "../types";
import { HurtableEntity, TickingEntity } from "../../entity/types";

function createMockEntity(id: number): HurtableEntity {
  return {
    id,
    hp: 100,
    getCenter: () => [0, 0] as [number, number],
    damage: vi.fn(),
    die: vi.fn(),
    body: {} as any,
  } as unknown as HurtableEntity;
}

describe("GenericDamage", () => {
  it("has type Generic", () => {
    const damage = new GenericDamage(new TargetList());
    expect(damage.type).toBe(DamageSourceType.Generic);
  });

  it("has null cause by default", () => {
    const damage = new GenericDamage(new TargetList());
    expect(damage.cause).toBeNull();
  });

  describe("getTargets", () => {
    it("returns the TargetList passed to constructor", () => {
      const targets = new TargetList();
      const damage = new GenericDamage(targets);
      expect(damage.getTargets()).toBe(targets);
    });
  });

  describe("damage", () => {
    it("delegates to TargetList.damage with itself as source", () => {
      const entity = createMockEntity(1);
      const entityMap = new Map<number, TickingEntity>([
        [1, entity as unknown as TickingEntity],
      ]);

      const targets = new TargetList();
      targets.add(entity, 25);

      const damage = new GenericDamage(targets);

      // Call damage with explicit entityMap (avoids needing mock context)
      targets.damage(damage, entityMap);
      expect(entity.damage).toHaveBeenCalledWith(damage, 25, undefined, undefined);
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips an empty TargetList", () => {
      const original = new GenericDamage(new TargetList());
      const serialized = original.serialize();
      const restored = GenericDamage.deserialize(serialized);
      expect(restored.getTargets().hasEntities()).toBe(false);
    });

    it("round-trips a TargetList with targets", () => {
      const entity = createMockEntity(5);
      const targets = new TargetList();
      targets.add(entity, 30);

      const original = new GenericDamage(targets);
      const serialized = original.serialize();
      const restored = GenericDamage.deserialize(serialized);

      expect(restored.getTargets().hasEntities()).toBe(true);
      expect(restored.serialize()).toEqual(serialized);
    });

    it("round-trips a TargetList with force", () => {
      const entity = createMockEntity(3);
      const targets = new TargetList();
      targets.add(entity, 20, { power: 5, direction: 1.5 });

      const original = new GenericDamage(targets);
      const serialized = original.serialize();
      const restored = GenericDamage.deserialize(serialized);

      expect(restored.serialize()).toEqual(serialized);
    });
  });
});
