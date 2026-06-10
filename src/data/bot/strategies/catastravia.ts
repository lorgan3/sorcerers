import { CATASTRAVIA } from "../../spells";
import { Character } from "../../entity/character";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

const HOLD_TICKS = 50;
const MISSILE_RADIUS_GAME = 12;
const MISSILE_MULTIPLIER = 2;
// Only a fraction of the cone's volley lands on any one target. Conservative
// starting value — refine during playtesting.
const EXPECTED_HITS_ON_TARGET = 3;
const MAX_RANGE_SCREEN = 800;
// The volley converges on the lock point but missiles overshoot and detonate up
// to roughly this far around it (observed in the spell-test harness). Allies are
// scored as if this much closer so a teammate "safely" beside the target still
// registers as friendly fire.
const VOLLEY_SCATTER_GAME = 35;

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

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Catastravia.spell,
      reachScreen: (MISSILE_RADIUS_GAME + 5 + VOLLEY_SCATTER_GAME) * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        if (Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]) > MAX_RANGE_SCREEN) {
          return null;
        }
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Catastravia.predictDamageAt(d),
      predictAllyDamageAt: (d) =>
        Catastravia.predictDamageAt(Math.max(0, d - VOLLEY_SCATTER_GAME)),
    });

    this.getNextEvaluation();
  }
}
