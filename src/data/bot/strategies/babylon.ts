import { BABYLON } from "../../spells";
import { Character } from "../../entity/character";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { predictFallDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
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

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Babylon.spell,
      reachScreen: SMALL_SWORD_RANGE_GAME * 6,
      // The swords land on the ground under the target, not at its body center.
      impactPoint: (target, { surface }) => {
        const feetXGame = target.body.position[0] + 3;
        const feetYGame = probeX(surface, feetXGame);
        return [feetXGame * 6, feetYGame * 6];
      },
      predictDamageAt: (d) => Babylon.predictDamageAt(d),
    });

    this.getNextEvaluation();
  }
}
