import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  COST_FLOOR,
  KILL_BONUS,
  MIN_RESERVE,
  predictExplosiveDamage,
  scoreCandidate,
  collectAllies,
} from "../scoring";
import { Character } from "../../../entity/character";

describe("predictExplosiveDamage", () => {
  it("returns 0 outside the blast radius", () => {
    expect(predictExplosiveDamage(40, 32, 8)).toBe(0);
  });

  it("returns full damage at the center", () => {
    // (5 + 5 * (32 - 0) / 32) * 8 = (5 + 5) * 8 = 80
    expect(predictExplosiveDamage(0, 32, 8)).toBe(80);
  });

  it("scales linearly with distance to the edge", () => {
    // (5 + 5 * (32 - 16) / 32) * 8 = (5 + 2.5) * 8 = 60
    expect(predictExplosiveDamage(16, 32, 8)).toBe(60);
  });

  it("respects damageMultiplier", () => {
    // (5 + 5) * 2 = 20 at center with mult=2
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
