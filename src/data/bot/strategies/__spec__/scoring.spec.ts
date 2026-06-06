import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  COST_FLOOR,
  KILL_BONUS,
  MIN_RESERVE,
  predictExplosiveDamage,
  predictImpactDamage,
  predictFallDamage,
  predictChainTargets,
  scoreCandidate,
  collectAllies,
  hasLineOfSight,
} from "../scoring";
import { CollisionMask } from "../../../collision/collisionMask";
import { Character } from "../../../entity/character";

describe("predictExplosiveDamage", () => {
  // Helper adds +5 to nominal radius internally — effective range = nominal + 5.

  it("returns 0 outside the effective blast radius", () => {
    // nominal 32 → effective 37; distance 40 is past the edge.
    expect(predictExplosiveDamage(40, 32, 8)).toBe(0);
  });

  it("returns full damage at the center", () => {
    // effective 37; (5 + 5 * (37 - 0) / 37) * 8 = 80
    expect(predictExplosiveDamage(0, 32, 8)).toBe(80);
  });

  it("scales linearly with distance toward the effective edge", () => {
    // effective 37; (5 + 5 * (37 - 18.5) / 37) * 8 = (5 + 2.5) * 8 = 60
    expect(predictExplosiveDamage(18.5, 32, 8)).toBeCloseTo(60);
  });

  it("respects damageMultiplier", () => {
    // nominal 16 → effective 21; at center: (5 + 5) * 2 = 20
    expect(predictExplosiveDamage(0, 16, 2)).toBe(20);
  });
});

describe("scoreCandidate", () => {
  beforeEach(() => {
    // Disable jitter for deterministic assertions.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when an ally would be killed", () => {
    const result = scoreCandidate({
      enemyDamage: 50,
      friendlyDamage: 0,
      killsAlly: true,
      targetHp: 100,
      spellCost: 6,
      currentMana: 100,
    });
    expect(result).toBeNull();
  });

  it("subtracts friendly damage from enemy damage 1:1", () => {
    const noFriendly = scoreCandidate({
      enemyDamage: 50,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 0,
      currentMana: 100,
    })!;
    const withFriendly = scoreCandidate({
      enemyDamage: 50,
      friendlyDamage: 20,
      killsAlly: false,
      targetHp: 100,
      spellCost: 0,
      currentMana: 100,
    })!;
    // (50 - 0) / (0 + COST_FLOOR)
    // (50 - 20) / (0 + COST_FLOOR)
    expect(noFriendly).toBeCloseTo(50 / COST_FLOOR);
    expect(withFriendly).toBeCloseTo(30 / COST_FLOOR);
  });

  it("adds kill bonus when enemy damage >= target hp", () => {
    const result = scoreCandidate({
      enemyDamage: 100,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 0,
      currentMana: 100,
    })!;
    // (100 + KILL_BONUS) / (0 + 5)
    expect(result).toBeCloseTo((100 + KILL_BONUS) / (0 + COST_FLOOR));
  });

  it("halves value when mana would drop below reserve and no kill", () => {
    const lowMana = scoreCandidate({
      enemyDamage: 30,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 8,
      currentMana: 10,  // 10 - 8 = 2, below MIN_RESERVE=5
    })!;
    const enoughMana = scoreCandidate({
      enemyDamage: 30,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 8,
      currentMana: 100,
    })!;
    expect(lowMana).toBeCloseTo(enoughMana * 0.5);
  });

  it("does NOT halve value when the cast is a kill, even with low mana", () => {
    const lowManaKill = scoreCandidate({
      enemyDamage: 200,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 8,
      currentMana: 10,
    })!;
    const enoughManaKill = scoreCandidate({
      enemyDamage: 200,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 8,
      currentMana: 100,
    })!;
    expect(lowManaKill).toBeCloseTo(enoughManaKill);
  });

  it("prefers cheap kills over expensive scratches", () => {
    const cheapKill = scoreCandidate({
      enemyDamage: 100,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 100,
      spellCost: 0,
      currentMana: 100,
    })!;
    const expensiveScratch = scoreCandidate({
      enemyDamage: 20,
      friendlyDamage: 0,
      killsAlly: false,
      targetHp: 200,
      spellCost: 15,
      currentMana: 100,
    })!;
    expect(cheapKill).toBeGreaterThan(expensiveScratch);
  });
});

describe("collectAllies", () => {
  function makeChar(playerRef: object): Character {
    return { player: playerRef } as unknown as Character;
  }

  it("returns characters that share the self's player, including self", () => {
    const playerA = { id: "A" };
    const playerB = { id: "B" };

    const self = makeChar(playerA);
    const teammate = makeChar(playerA);
    const enemy = makeChar(playerB);

    const allCharacters = [self, teammate, enemy];

    const allies = collectAllies(self, allCharacters);
    expect(allies).toEqual([self, teammate]);
  });

  it("returns just self when there are no teammates", () => {
    const playerA = { id: "A" };
    const self = makeChar(playerA);
    const allies = collectAllies(self, [self]);
    expect(allies).toEqual([self]);
  });
});

describe("hasLineOfSight", () => {
  it("is true across an empty mask and false through a solid column", () => {
    // 100x100 game-unit mask, all empty.
    const empty = CollisionMask.forRect(100, 100);
    empty.subtract(CollisionMask.forRect(100, 100), 0, 0);
    expect(
      hasLineOfSight(empty, [60, 60], [540, 60]) // screen px → game units 10..90
    ).toBe(true);

    // Fill a vertical wall at game x=50 (the midpoint of the ray).
    const walled = CollisionMask.forRect(100, 100);
    walled.subtract(CollisionMask.forRect(100, 100), 0, 0);
    const wallColumn = CollisionMask.forRect(1, 100);
    walled.add(wallColumn, 50, 0);
    expect(hasLineOfSight(walled, [60, 60], [540, 60])).toBe(false);
  });
});

describe("predictImpactDamage", () => {
  it("returns full power within 16 game units, else 0", () => {
    expect(predictImpactDamage(10, 25)).toBe(25);
    expect(predictImpactDamage(20, 25)).toBe(0);
  });
});

describe("predictFallDamage", () => {
  it("returns full power within the shape range, else 0", () => {
    // SwordTip range = 80px = ~13.33 game units
    expect(predictFallDamage(10, 80 / 6, 4)).toBe(4);
    expect(predictFallDamage(20, 80 / 6, 4)).toBe(0);
  });
});

describe("predictChainTargets", () => {
  it("counts enemies reachable by chaining within range, capped at maxChains", () => {
    const start: [number, number] = [0, 0];
    const enemies: [number, number][] = [
      [200, 0],   // chain 1 from start
      [400, 0],   // chain 2 (within 260 of #1)
      [2000, 0],  // far away — unreachable
    ];
    expect(predictChainTargets(start, enemies, 260, 5)).toBe(2);
  });

  it("never exceeds maxChains", () => {
    const start: [number, number] = [0, 0];
    const enemies: [number, number][] = Array.from(
      { length: 10 },
      (_, i) => [i * 100, 0] as [number, number],
    );
    expect(predictChainTargets(start, enemies, 260, 5)).toBe(5);
  });

  it("returns 0 when there are no reachable enemies", () => {
    const start: [number, number] = [0, 0];
    expect(predictChainTargets(start, [], 260, 5)).toBe(0);
    expect(predictChainTargets(start, [[1000, 0]], 260, 5)).toBe(0);
  });
});
