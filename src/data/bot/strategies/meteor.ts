import { METEOR } from "../../spells";
import { getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
import { probeX } from "../../map/utils";

// Long enough for the Lock cursor to acquire the target before release — the Lock
// only casts once locked, so too short a hold would miss the targeting window.
const HOLD_TICKS = 70;
const BLAST_RADIUS_GAME = 16;
// Bounces that land near the target before the meteor travels off. Conservative
// starting value — refine during playtesting.
const EXPECTED_BOUNCES = 2;

export class Meteor extends ChargedHoldReleaseCast {
  public static spell = METEOR;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, elementalValue: number): number {
    const multiplier = 5 + elementalValue / 2;
    return (
      predictExplosiveDamage(distanceGameUnits, BLAST_RADIUS_GAME, multiplier) *
      EXPECTED_BOUNCES
    );
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const elemental = getManager().getElementValue(Element.Elemental);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Meteor.spell,
      reachScreen: (BLAST_RADIUS_GAME + 5) * 6,
      // The meteor lands on the ground under the target, not at its body center.
      impactPoint: (target, { surface }) => {
        const feetXGame = target.body.position[0] + 3;
        const feetYGame = probeX(surface, feetXGame);
        return [feetXGame * 6, feetYGame * 6];
      },
      predictDamageAt: (d) => Meteor.predictDamageAt(d, elemental),
    });

    this.getNextEvaluation();
  }
}
