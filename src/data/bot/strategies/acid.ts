import { ACID } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { InstantPressCast } from "./instantPressCast";
import {
  collectAllies,
  hasLineOfSight,
  predictFallDamage,
  scoreAOECandidate,
} from "./scoring";

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
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;
    const life = getManager().getElementValue(Element.Life);

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
          return Acid.predictDamageAt(d, life);
        };

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: Acid.spell,
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
