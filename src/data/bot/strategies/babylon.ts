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
// The rain of swords scatters around the aim column up to roughly this far; allies
// are scored as if this much closer so neighbours of the target count as friendly fire.
const SWORD_SPREAD_GAME = 20;

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
      reachScreen: (SMALL_SWORD_RANGE_GAME + SWORD_SPREAD_GAME) * 6,
      // Characters are baked into the collision mask the swords fall against, so
      // an unobstructed target is struck at its body — and the damage point sits
      // 10 units below the collision (fallDamage.ts) — not on the ground beside
      // it. Only terrain above the target's center (a roof) stops the rain.
      impactPoint: (target, { surface }) => {
        const center = target.getCenter();
        const firstTerrainY = probeX(surface, target.body.position[0] + 3);
        if (firstTerrainY < center[1] / 6) return null;
        return center;
      },
      predictDamageAt: (d) => Babylon.predictDamageAt(d),
      predictAllyDamageAt: (d) =>
        Babylon.predictDamageAt(Math.max(0, d - SWORD_SPREAD_GAME)),
    });

    this.getNextEvaluation();
  }
}
