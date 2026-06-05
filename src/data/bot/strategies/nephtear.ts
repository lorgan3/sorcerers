import { NEPHTEAR } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import {
  collectAllies,
  hasLineOfSight,
  predictImpactDamage,
  scoreAOECandidate,
} from "./scoring";

const HOLD_TICKS = 40;
const AIM_LIFT_PIXELS = 40;
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
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;
    const elementValue = getManager().getElementValue(Element.Elemental);

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(myCenter[0], myCenter[1], MAX_RANGE_SCREEN, (e) => {
      if (e instanceof Character) everyone.push(e);
    });
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > MAX_RANGE_SCREEN || distance < MIN_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, targetCenter)) return null;

        const impactXGame = targetCenter[0] / 6;
        const impactYGame = targetCenter[1] / 6;
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - impactXGame) ** 2 + (sy / 6 - impactYGame) ** 2,
          );
          return Nephtear.predictDamageAt(d, elementValue);
        };

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Nephtear.spell,
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
