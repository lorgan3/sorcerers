import { Character } from "../../entity/character";
import { Spell, getSpellCost } from "../../spells";

export const COST_FLOOR = 15;
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
    input.spellCost > 0 &&
    input.currentMana - input.spellCost < MIN_RESERVE &&
    killBonus === 0;
  const reserveScale = wouldStarve ? 0.5 : 1.0;

  return efficiency * reserveScale + Math.random() * JITTER;
}

/**
 * HP damage falloff for an explosive impact, mirroring `ExplosiveDamage.getTargets()`.
 *
 * Pass the spell's `nominalRadius` (game units). The real engine adds +5 game units
 * to that radius when collecting targets and computing falloff
 * (see `explosiveDamage.ts:118-130`); this helper bakes the +5 in so callers don't
 * have to remember it.
 *
 * `distance` and `nominalRadius` must be in the same units (game units recommended).
 */
export function predictExplosiveDamage(
  distance: number,
  nominalRadius: number,
  damageMultiplier: number,
): number {
  const effectiveRange = nominalRadius + 5;
  if (distance > effectiveRange) return 0;
  return (5 + 5 * (effectiveRange - distance) / effectiveRange) * damageMultiplier;
}

export function collectAllies(
  self: Character,
  allCharacters: Character[],
): Character[] {
  return allCharacters.filter((c) => c.player === self.player);
}

/**
 * Shared scoring loop for AOE strategies (Bakuretsu, Fireball). The caller provides
 * a `predictDamage` function curried with whatever impact point the spell uses, and
 * this helper handles: sum enemy damage, sum friendly damage, detect ally-kills,
 * and call `scoreCandidate`.
 */
export function scoreAOECandidate(args: {
  target: Character;
  allies: Character[];
  predictDamage: (character: Character) => number;
  spell: Spell;
  currentMana: number;
}): number | null {
  const enemyDamage = args.predictDamage(args.target);

  let friendlyDamage = 0;
  let killsAlly = false;
  for (const ally of args.allies) {
    const d = args.predictDamage(ally);
    friendlyDamage += d;
    if (d >= ally.hp) killsAlly = true;
  }

  return scoreCandidate({
    enemyDamage,
    friendlyDamage,
    killsAlly,
    targetHp: args.target.hp,
    spellCost: getSpellCost(args.spell),
    currentMana: args.currentMana,
  });
}
