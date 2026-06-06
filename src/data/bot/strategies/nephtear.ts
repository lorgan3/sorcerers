import { NEPHTEAR } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictImpactDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

const HOLD_TICKS = 40;
const AIM_LIFT_PIXELS = 40;
// ImpactDamage applies within a 16-game-unit circle (impactDamage.ts); ×6 → screen px.
const IMPACT_RADIUS_GAME = 16;
const MAX_RANGE_SCREEN = 700;
const MIN_RANGE_SCREEN = 120;

export class Nephtear extends ChargedHoldReleaseCast {
  public static spell = NEPHTEAR;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    const [cx, cy] = this.evaluation!.target.centerScreen;
    return [cx, cy - AIM_LIFT_PIXELS];
  }

  static predictDamageAt(distanceGameUnits: number, elementValue: number): number {
    const power = 30 * (0.7 + elementValue * 0.3);
    return predictImpactDamage(distanceGameUnits, power);
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const elementValue = getManager().getElementValue(Element.Elemental);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Nephtear.spell,
      reachScreen: IMPACT_RADIUS_GAME * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        const distance = Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]);
        if (distance > MAX_RANGE_SCREEN || distance < MIN_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Nephtear.predictDamageAt(d, elementValue),
    });

    this.getNextEvaluation();
  }
}
