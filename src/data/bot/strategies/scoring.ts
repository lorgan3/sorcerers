import { Character } from "../../entity/character";
import { Spell, getSpellCost } from "../../spells";
import { CollisionMask } from "../../collision/collisionMask";

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

// ImpactDamage applies a flat `power` to entities within a 16-game-unit circle
// (no distance falloff — see impactDamage.ts). `distanceGameUnits` is target → impact.
export function predictImpactDamage(
  distanceGameUnits: number,
  power: number,
): number {
  return distanceGameUnits <= 16 ? power : 0;
}

// FallDamage applies a flat `power` within the shape's range (no falloff — see
// fallDamage.ts). Pass the shape's range in GAME units (engine constants are px; ÷6).
export function predictFallDamage(
  distanceGameUnits: number,
  rangeGameUnits: number,
  power: number,
): number {
  return distanceGameUnits <= rangeGameUnits ? power : 0;
}

// Greedy estimate of how many enemies a chain effect reaches: from `start`, repeatedly
// hop to the nearest not-yet-hit enemy within `chainRange` (screen px), up to `maxChains`.
export function predictChainTargets(
  start: [number, number],
  enemiesScreen: [number, number][],
  chainRange: number,
  maxChains: number,
): number {
  const remaining = enemiesScreen.slice();
  let from = start;
  let hits = 0;
  while (hits < maxChains && remaining.length > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dx = remaining[i][0] - from[0];
      const dy = remaining[i][1] - from[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= chainRange && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    from = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
    hits++;
  }
  return hits;
}

// Coordinates are screen px; the mask works in game units, hence the ÷6.
export function hasLineOfSight(
  surface: CollisionMask,
  fromScreen: [number, number],
  toScreen: [number, number],
): boolean {
  return !surface.collidesWithLine(
    Math.round(fromScreen[0] / 6),
    Math.round(fromScreen[1] / 6),
    Math.round(toScreen[0] / 6),
    Math.round(toScreen[1] / 6),
  );
}
