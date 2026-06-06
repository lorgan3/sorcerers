import { ARTHUR_SWORD } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { predictFallDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
import { probeX } from "../../map/utils";

const HOLD_TICKS = 30;
// 80 = SwordTip shape's range in screen px (fallDamage.ts); ÷6 → game units.
const SWORD_RANGE_GAME = 80 / 6;
// The sword bounces many times; assume a few land within range of a target under the
// landing column. Conservative starting value — refine during playtesting.
const EXPECTED_HITS = 3;

export class ArthurSword extends ChargedHoldReleaseCast {
  public static spell = ARTHUR_SWORD;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    // Aim at the target's X; the sword falls from the sky there. Y is irrelevant.
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, arcaneValue: number): number {
    const perHit = 2 + 2 * arcaneValue;
    return predictFallDamage(distanceGameUnits, SWORD_RANGE_GAME, perHit) * EXPECTED_HITS;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const arcane = getManager().getElementValue(Element.Arcane);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: ArthurSword.spell,
      reachScreen: SWORD_RANGE_GAME * 6,
      // The sword lands on the ground under the target, not at its body center.
      impactPoint: (target, { surface }) => {
        const feetXGame = target.body.position[0] + 3;
        const feetYGame = probeX(surface, feetXGame);
        return [feetXGame * 6, feetYGame * 6];
      },
      predictDamageAt: (d) => ArthurSword.predictDamageAt(d, arcane),
    });

    this.getNextEvaluation();
  }
}
