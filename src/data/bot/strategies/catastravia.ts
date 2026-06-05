import { CATASTRAVIA } from "../../spells";
import { getLevel } from "../../context";
import { Character } from "../../entity/character";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import {
  collectAllies,
  hasLineOfSight,
  predictExplosiveDamage,
  scoreAOECandidate,
} from "./scoring";

const HOLD_TICKS = 50;
const MISSILE_RADIUS_GAME = 12;
const MISSILE_MULTIPLIER = 2;
// Only a fraction of the cone's volley lands on any one target. Conservative
// starting value — refine during playtesting.
const EXPECTED_HITS_ON_TARGET = 3;
const MAX_RANGE_SCREEN = 800;

export class Catastravia extends ChargedHoldReleaseCast {
  public static spell = CATASTRAVIA;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number): number {
    return (
      predictExplosiveDamage(distanceGameUnits, MISSILE_RADIUS_GAME, MISSILE_MULTIPLIER) *
      EXPECTED_HITS_ON_TARGET
    );
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(myCenter[0], myCenter[1], MAX_RANGE_SCREEN, (entity) => {
      if (entity instanceof Character) everyone.push(entity);
    });
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        if (Math.sqrt(dx * dx + dy * dy) > MAX_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, targetCenter)) return null;

        const impactXGame = targetCenter[0] / 6;
        const impactYGame = targetCenter[1] / 6;
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - impactXGame) ** 2 + (sy / 6 - impactYGame) ** 2,
          );
          return Catastravia.predictDamageAt(d);
        };

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Catastravia.spell,
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
