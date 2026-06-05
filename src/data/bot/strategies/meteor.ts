import { METEOR } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { collectAllies, predictExplosiveDamage, scoreAOECandidate } from "./scoring";
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
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const currentMana = this.character.player.mana;
    const surface = getLevel().terrain.collisionMask;
    const elemental = getManager().getElementValue(Element.Elemental);

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      ...this.character.getCenter(),
      BLAST_RADIUS_GAME * 6 * 5,
      (entity) => {
        if (entity instanceof Character) everyone.push(entity);
      },
    );
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const feetXGame = target.body.position[0] + 3;
        const feetYGame = probeX(surface, feetXGame);
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - feetXGame) ** 2 + (sy / 6 - feetYGame) ** 2,
          );
          return Meteor.predictDamageAt(d, elemental);
        };
        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Meteor.spell,
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
