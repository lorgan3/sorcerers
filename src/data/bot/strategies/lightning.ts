import { LIGHTNING, getSpellCost } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { angleDiff, getAngle, getSquareDistance } from "../../../util/math";
import { hasLineOfSight, scoreCandidate } from "./scoring";

const HOLD_TICKS = 35;
// Chain hop range — matches ChainLightning.maxRange (screen px).
const CHAIN_RANGE_SCREEN = 260;
// First-hop acquisition cone — matches ChainLightning.maxAngle.
const MAX_FIRST_HOP_ANGLE = Math.PI / 4;
const MAX_CHAINS = 5;
// Where to stand: close enough that the first hop reaches the target with margin
// for the path follower not stopping on the exact pixel.
const STANDOFF_GAME = Math.floor(CHAIN_RANGE_SCREEN / 6) - 10;
// Longest repositioning walk (game units, straight-line) the spell is worth: a
// cross-map march burns the whole turn and exposes the bot on the way.
const MAX_APPROACH_GAME = 150;
// Only reposition along roughly level ground. Approaches that drop off ledges
// take unpredicted fall damage on the way in.
const MAX_APPROACH_CLIMB_GAME = 20;

export class Lightning extends ChargedHoldReleaseCast {
  public static spell = LIGHTNING;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictPerTarget(elementalValue: number): number {
    return 20 + elementalValue * 5;
  }

  /**
   * The characters the chain actually hits when cast from `originScreen` aimed
   * along `direction`, in hit order. Mirrors `ChainLightning.cast`: the first hop
   * goes to the smallest angular offset within a ±45° cone (range-limited), every
   * later hop to the nearest not-yet-hit character — friend or foe alike.
   */
  static simulateChain(
    originScreen: [number, number],
    direction: number,
    characters: Character[],
  ): Character[] {
    const hits: Character[] = [];
    let [checkX, checkY] = originScreen;

    for (let i = 0; i < MAX_CHAINS; i++) {
      let best: Character | null = null;
      let bestKey = Infinity;
      for (const candidate of characters) {
        if (hits.includes(candidate)) continue;
        const center = candidate.getCenter();
        const distanceSquared = getSquareDistance(checkX, checkY, ...center);
        if (distanceSquared > CHAIN_RANGE_SCREEN ** 2) continue;

        const key =
          i === 0
            ? Math.abs(angleDiff(direction, getAngle(checkX, checkY, ...center)))
            : distanceSquared;
        if (i === 0 && key >= MAX_FIRST_HOP_ANGLE) continue;
        if (key < bestKey) {
          bestKey = key;
          best = candidate;
        }
      }
      if (!best) break;
      hits.push(best);
      [checkX, checkY] = best.getCenter();
    }

    return hits;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;
    const perTarget = Lightning.predictPerTarget(
      getManager().getElementValue(Element.Elemental),
    );

    // Every character on the level: the chain is simulated from the stand-off
    // spot beside the target, which can be far from where the bot stands now.
    const allCharacters: Character[] = [];
    getLevel().entities.forEach((entity) => {
      if (entity instanceof Character && entity !== this.character) {
        allCharacters.push(entity);
      }
    });

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        // The chain is short-ranged, so walk to a stand-off spot beside the
        // target and predict the cast from there rather than from where the bot
        // happens to be standing now.
        const targetFoot = target.body.position;
        const standCandidates = [
          graph.getClosestNode(targetFoot[0] - STANDOFF_GAME, targetFoot[1] + 8),
          graph.getClosestNode(targetFoot[0] + 6 + STANDOFF_GAME, targetFoot[1] + 8),
        ];

        const myFoot = this.character.bodyFootCenter;
        let best: Evaluation | null = null;
        for (const node of standCandidates) {
          if (!node) continue;
          if (
            getSquareDistance(node.x, node.y, ...myFoot) >
              MAX_APPROACH_GAME ** 2 ||
            Math.abs(node.y - myFoot[1]) > MAX_APPROACH_CLIMB_GAME
          ) {
            continue;
          }
          // Cast origin if the bot stands at this node (center is ~8 above feet).
          const origin: [number, number] = [node.x * 6, (node.y - 8) * 6];
          const targetCenter = target.getCenter();
          if (
            getSquareDistance(...origin, ...targetCenter) >
            CHAIN_RANGE_SCREEN ** 2
          ) {
            continue;
          }
          if (!hasLineOfSight(surface, origin, targetCenter)) continue;

          const hits = Lightning.simulateChain(
            origin,
            getAngle(...origin, ...targetCenter),
            allCharacters,
          );
          if (!hits.includes(target)) continue;

          let enemyDamage = 0;
          let friendlyDamage = 0;
          let killsAlly = false;
          for (const hit of hits) {
            if (hit.player === this.character.player) {
              friendlyDamage += perTarget;
              if (perTarget >= hit.hp) killsAlly = true;
            } else {
              enemyDamage += perTarget;
            }
          }

          const value = scoreCandidate({
            enemyDamage,
            friendlyDamage,
            killsAlly,
            targetHp: target.hp,
            spellCost: getSpellCost(Lightning.spell),
            currentMana,
          });
          if (value === null) continue;
          if (!best || value > best.value) {
            best = { target: Cluster.onCharacter(target), value, to: [node] };
          }
        }
        return best;
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }
}
