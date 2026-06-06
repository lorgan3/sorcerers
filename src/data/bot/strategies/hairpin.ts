import { HAIRPIN } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

const HOLD_TICKS = 45;
const BOMB_RADIUS_GAME = 16;
// Of the 3 launched bombs, assume ~2 land near a point target. Conservative
// starting value — refine during playtesting.
const EXPECTED_BOMBS = 2;
const MAX_RANGE_SCREEN = 700;

export class Hairpin extends ChargedHoldReleaseCast {
  public static spell = HAIRPIN;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, elementalValue: number): number {
    const multiplier = 5 * (0.7 + elementalValue * 0.3);
    return predictExplosiveDamage(distanceGameUnits, BOMB_RADIUS_GAME, multiplier) * EXPECTED_BOMBS;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const elemental = getManager().getElementValue(Element.Elemental);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Hairpin.spell,
      reachScreen: (BOMB_RADIUS_GAME + 5) * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        if (Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]) > MAX_RANGE_SCREEN) {
          return null;
        }
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Hairpin.predictDamageAt(d, elemental),
    });

    this.getNextEvaluation();
  }
}
