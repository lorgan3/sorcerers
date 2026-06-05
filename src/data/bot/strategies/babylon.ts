import { BABYLON } from "../../spells";
import { getLevel } from "../../context";
import { Character } from "../../entity/character";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { collectAllies, predictFallDamage, scoreAOECandidate } from "./scoring";
import { probeX } from "../../map/utils";

const HOLD_TICKS = 30;
// 30 = SmallSword shape's range in screen px (fallDamage.ts); ÷6 → game units.
const SMALL_SWORD_RANGE_GAME = 30 / 6;
const PER_HIT = 8; // flat, no element scaling (smallSword.ts)
// Several of the ~10+ swords land near a target under the spread. Conservative
// starting value — refine during playtesting.
const EXPECTED_HITS = 4;

export class Babylon extends ChargedHoldReleaseCast {
  public static spell = BABYLON;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    // Aim at the target's X; swords rain from the sky near it.
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number): number {
    return predictFallDamage(distanceGameUnits, SMALL_SWORD_RANGE_GAME, PER_HIT) * EXPECTED_HITS;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const currentMana = this.character.player.mana;
    const surface = getLevel().terrain.collisionMask;

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      ...this.character.getCenter(),
      SMALL_SWORD_RANGE_GAME * 6 * 4,
      (entity) => {
        if (entity instanceof Character) everyone.push(entity);
      },
    );
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const feetXGame = target.body.position[0] + 3;
        const feetYGame = probeX(surface, feetXGame);
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - feetXGame) ** 2 + (sy / 6 - feetYGame) ** 2,
          );
          return Babylon.predictDamageAt(d);
        };
        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Babylon.spell,
          currentMana,
        });
        if (value === null) return null;
        return { target: Cluster.onCharacter(target), value, to: [myNode] };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }
}
