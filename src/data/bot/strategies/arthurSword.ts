import { ARTHUR_SWORD } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { collectAllies, predictFallDamage, scoreAOECandidate } from "./scoring";
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
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const currentMana = this.character.player.mana;
    const surface = getLevel().terrain.collisionMask;
    const arcane = getManager().getElementValue(Element.Arcane);

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      ...this.character.getCenter(),
      SWORD_RANGE_GAME * 6 * 4,
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
          return ArthurSword.predictDamageAt(d, arcane);
        };
        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: ArthurSword.spell,
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
