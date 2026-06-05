import { HAIRPIN } from "../../spells";
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
  predictExplosiveDamage,
  scoreAOECandidate,
} from "./scoring";

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
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;
    const elemental = getManager().getElementValue(Element.Elemental);

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(myCenter[0], myCenter[1], MAX_RANGE_SCREEN, (entity) => {
      if (entity instanceof Character) everyone.push(entity);
    });
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        if (Math.sqrt(dx * dx + dy * dy) > MAX_RANGE_SCREEN) return null;
        if (!hasLineOfSight(surface, myCenter, targetCenter)) return null;

        const impactXGame = targetCenter[0] / 6;
        const impactYGame = targetCenter[1] / 6;
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - impactXGame) ** 2 + (sy / 6 - impactYGame) ** 2,
          );
          return Hairpin.predictDamageAt(d, elemental);
        };

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Hairpin.spell,
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
