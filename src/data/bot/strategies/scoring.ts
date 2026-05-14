import { Character } from "../../entity/character";

export const COST_FLOOR = 5;
export const KILL_BONUS = 50;
export const MIN_RESERVE = 5;
export const JITTER = 5;

export interface ScoreInput {
  enemyDamage: number;
  friendlyDamage: number;
  killsAlly: boolean;
  targetHp: number;
  spellCost: number;
  currentMana: number;
}

export function scoreCandidate(input: ScoreInput): number | null {
  if (input.killsAlly) return null;

  const gross = input.enemyDamage - input.friendlyDamage;
  const killBonus = input.enemyDamage >= input.targetHp ? KILL_BONUS : 0;
  const efficiency = (gross + killBonus) / (input.spellCost + COST_FLOOR);

  const wouldStarve =
    input.currentMana - input.spellCost < MIN_RESERVE && killBonus === 0;
  const reserveScale = wouldStarve ? 0.5 : 1.0;

  return efficiency * reserveScale + Math.random() * JITTER;
}

/**
 * HP damage falloff for an explosive impact, mirroring `ExplosiveDamage.getTargets()`.
 *
 * IMPORTANT: callers must pass the spell's `nominalRadius + 5` as `range`.
 * The real engine adds +5 game units to the spell's `range` field when collecting
 * targets and computing falloff (see `explosiveDamage.ts:118-130`). Passing the
 * raw nominal radius will under-predict damage at the blast fringe.
 *
 * `distance` and `range` must be in the same units (game units recommended).
 */
export function predictExplosiveDamage(
  distance: number,
  range: number,
  damageMultiplier: number,
): number {
  if (distance > range) return 0;
  return (5 + 5 * (range - distance) / range) * damageMultiplier;
}

export function collectAllies(
  self: Character,
  allCharacters: Character[],
): Character[] {
  return allCharacters.filter((c) => c.player === self.player);
}
