import { describe, it, expect, vi } from "vitest";
import { TargetList } from "../targetList";
import { HurtableEntity, TickingEntity } from "../../entity/types";
import { DamageSource, DamageSourceType } from "../types";

function createMockEntity(
  id: number,
  center: [number, number] = [0, 0]
): HurtableEntity {
  return {
    id,
    hp: 100,
    getCenter: () => center,
    damage: vi.fn(),
    die: vi.fn(),
    body: {} as any,
  } as unknown as HurtableEntity;
}

function createMockDamageSource(): DamageSource {
  return {
    type: DamageSourceType.Generic,
    cause: null,
    damage: vi.fn(),
    serialize: vi.fn(),
    getTargets: vi.fn(),
  };
}

describe("TargetList", () => {
  describe("add", () => {
    it("adds targets and allows chaining", () => {
      const list = new TargetList();
      const entity = createMockEntity(1);

      const result = list.add(entity, 10);

      expect(result).toBe(list);
    });
  });

  describe("damage", () => {
    it("applies damage to entities found in the entity map", () => {
      const entity = createMockEntity(1);
      const entityMap = new Map<number, TickingEntity>([[1, entity as unknown as TickingEntity]]);
      const source = createMockDamageSource();

      const list = new TargetList();
      list.add(entity, 25);
      list.damage(source, entityMap);

      expect(entity.damage).toHaveBeenCalledWith(source, 25, undefined);
    });

    it("applies damage with force when provided", () => {
      const entity = createMockEntity(1);
      const entityMap = new Map<number, TickingEntity>([[1, entity as unknown as TickingEntity]]);
      const source = createMockDamageSource();
      const force = { power: 5, direction: Math.PI / 4 };

      const list = new TargetList();
      list.add(entity, 15, force);
      list.damage(source, entityMap);

      expect(entity.damage).toHaveBeenCalledWith(source, 15, force);
    });

    it("skips entities not found in the entity map", () => {
      const entity = createMockEntity(99);
      const entityMap = new Map<number, TickingEntity>();
      const source = createMockDamageSource();

      const list = new TargetList();
      list.add(entity, 10);
      list.damage(source, entityMap);

      expect(entity.damage).not.toHaveBeenCalled();
    });

    it("damages multiple targets", () => {
      const entity1 = createMockEntity(1);
      const entity2 = createMockEntity(2);
      const entityMap = new Map<number, TickingEntity>([
        [1, entity1 as unknown as TickingEntity],
        [2, entity2 as unknown as TickingEntity],
      ]);
      const source = createMockDamageSource();

      const list = new TargetList();
      list.add(entity1, 10);
      list.add(entity2, 20);
      list.damage(source, entityMap);

      expect(entity1.damage).toHaveBeenCalledWith(source, 10, undefined);
      expect(entity2.damage).toHaveBeenCalledWith(source, 20, undefined);
    });
  });

  describe("serialize / deserialize", () => {
    it("round-trips targets without force", () => {
      const entity = createMockEntity(5);

      const list = new TargetList();
      list.add(entity, 30);

      const serialized = list.serialize();
      const deserialized = TargetList.deserialize(serialized);

      expect(deserialized.serialize()).toEqual(serialized);
    });

    it("round-trips targets with force", () => {
      const entity = createMockEntity(3);
      const force = { power: 7, direction: 1.5 };

      const list = new TargetList();
      list.add(entity, 20, force);

      const serialized = list.serialize();
      const deserialized = TargetList.deserialize(serialized);

      expect(deserialized.serialize()).toEqual(serialized);
    });

    it("omits force when power is 0", () => {
      const entity = createMockEntity(1);

      const list = new TargetList();
      list.add(entity, 10, { power: 0, direction: 1 });

      const serialized = list.serialize();
      expect(serialized[0]).toEqual([1, 10]);
    });

    it("deserializes undefined as empty list", () => {
      const list = TargetList.deserialize(undefined);
      expect(list.hasEntities()).toBe(false);
    });
  });

  describe("hasEntities", () => {
    it("returns false for empty list", () => {
      const list = new TargetList();
      expect(list.hasEntities()).toBe(false);
    });

    it("returns true when targets exist", () => {
      const list = new TargetList();
      list.add(createMockEntity(1), 10);
      expect(list.hasEntities()).toBe(true);
    });
  });

  describe("getEntities", () => {
    it("retrieves entities from the entity map", () => {
      const entity = createMockEntity(1);
      const entityMap = new Map<number, TickingEntity>([[1, entity as unknown as TickingEntity]]);

      const list = new TargetList();
      list.add(entity, 10);

      const entities = list.getEntities(entityMap);
      expect(entities).toEqual([entity]);
    });
  });
});
