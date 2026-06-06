import { ACID } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { InstantPressCast } from "./instantPressCast";
import { hasLineOfSight, predictFallDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

// 90 = Acid shape's range in screen px (fallDamage.ts); ÷6 → game units.
const ACID_RANGE_GAME = 90 / 6;
const PER_DROPLET_BASE = 3;
// Of the ~13 droplets over the spray, a few land near a stationary target.
// Conservative starting value — refine during playtesting.
const EXPECTED_DROPLETS = 4;
const MAX_RANGE_SCREEN = 500;
const MIN_RANGE_SCREEN = 80;

export class Acid extends InstantPressCast {
  public static spell = ACID;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, lifeValue: number): number {
    const perDroplet = PER_DROPLET_BASE + lifeValue;
    return predictFallDamage(distanceGameUnits, ACID_RANGE_GAME, perDroplet) * EXPECTED_DROPLETS;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const life = getManager().getElementValue(Element.Life);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Acid.spell,
      reachScreen: ACID_RANGE_GAME * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        const distance = Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]);
        if (distance > MAX_RANGE_SCREEN || distance < MIN_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Acid.predictDamageAt(d, life),
    });

    this.getNextEvaluation();
  }
}
