import { DORAGATE } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

const HOLD_TICKS = 40;
const PEBBLE_RADIUS_GAME = 4;
// Of the 4+ launched pebbles, assume ~2 graze a point target. Conservative
// starting value — refine during playtesting.
const EXPECTED_PEBBLES = 2;
const MAX_RANGE_SCREEN = 600;

export class Doragate extends ChargedHoldReleaseCast {
  public static spell = DORAGATE;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, arcaneValue: number): number {
    const multiplier = 1.5 + arcaneValue * 0.7;
    return predictExplosiveDamage(distanceGameUnits, PEBBLE_RADIUS_GAME, multiplier) * EXPECTED_PEBBLES;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const arcane = getManager().getElementValue(Element.Arcane);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Doragate.spell,
      reachScreen: (PEBBLE_RADIUS_GAME + 5) * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        if (Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]) > MAX_RANGE_SCREEN) {
          return null;
        }
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Doragate.predictDamageAt(d, arcane),
    });

    this.getNextEvaluation();
  }
}
