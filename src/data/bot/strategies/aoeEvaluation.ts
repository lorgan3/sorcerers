import { getLevel } from "../../context";
import { Character } from "../../entity/character";
import { CollisionMask } from "../../collision/collisionMask";
import { Spell } from "../../spells";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { collectAllies, scoreAOECandidate } from "./scoring";

export interface AOEContext {
  myCenter: [number, number];
  surface: CollisionMask;
}

export interface AOEStrategyConfig {
  spell: Spell;
  // Effective blast reach in screen px: the farthest a character can sit from the impact
  // point and still take damage. Allies are gathered within this radius of each impact
  // point, so teammates near a distant target are considered for friendly fire even when
  // they stand far from the bot.
  reachScreen: number;
  // Resolve a target to its impact point (screen px), or return null to reject it
  // (out of range, blocked line of sight, …). `context` carries the bot center + terrain.
  impactPoint: (target: Character, context: AOEContext) => [number, number] | null;
  // Damage dealt at `distanceGameUnits` from the impact point (element scaling baked in).
  predictDamageAt: (distanceGameUnits: number) => number;
  // Ally-specific damage prediction, for spells whose secondary effects (bounces,
  // lingering areas) can drift beyond the initial blast. Defaults to predictDamageAt.
  predictAllyDamageAt?: (distanceGameUnits: number) => number;
}

/**
 * Shared evaluate() body for AOE strategies: gather candidates, score each target's impact
 * with its allies, and return them sorted best-first. Strategies supply only the
 * spell-specific bits via `config` (impact point + gating, damage falloff, blast reach).
 */
export function evaluateAOECandidates(
  character: Character,
  graph: Graph,
  targets: Character[],
  config: AOEStrategyConfig,
): Evaluation[] {
  const myCenter = character.getCenter();
  const myNode = graph.getClosestNode(...character.bodyFootCenter);
  const surface = getLevel().terrain.collisionMask;
  const currentMana = character.player.mana;
  const context: AOEContext = { myCenter, surface };

  return targets
    .slice(0, 3)
    .map((target) => {
      const impact = config.impactPoint(target, context);
      if (!impact) return null;

      // Gather allies around the impact point — not the bot — so we never blow up a
      // teammate standing next to a far-off target just because it was beyond bot range.
      const allyPool: Character[] = [];
      getLevel().withNearbyEntities(
        impact[0],
        impact[1],
        config.reachScreen,
        (entity) => {
          if (entity instanceof Character) allyPool.push(entity);
        },
      );
      const allies = collectAllies(character, allyPool);

      const impactXGame = impact[0] / 6;
      const impactYGame = impact[1] / 6;
      const distanceTo = (c: Character) => {
        const [sx, sy] = c.getCenter();
        return Math.sqrt(
          (sx / 6 - impactXGame) ** 2 + (sy / 6 - impactYGame) ** 2,
        );
      };

      const value = scoreAOECandidate({
        target,
        allies,
        predictDamage: (c) => config.predictDamageAt(distanceTo(c)),
        predictAllyDamage: config.predictAllyDamageAt
          ? (c) => config.predictAllyDamageAt!(distanceTo(c))
          : undefined,
        spell: config.spell,
        currentMana,
      });
      if (value === null) return null;
      return { target: Cluster.onCharacter(target), value, to: [myNode] };
    })
    .filter(Boolean)
    .sort((a, b) => b!.value - a!.value) as Evaluation[];
}
