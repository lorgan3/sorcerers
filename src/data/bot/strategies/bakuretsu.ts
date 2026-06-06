import { BAKURETSU } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { collectAllies, predictExplosiveDamage, scoreAOECandidate } from "./scoring";
import { probeX } from "../../map/utils";
import { InstantPressCast } from "./instantPressCast";

export class Bakuretsu extends InstantPressCast {
  public static spell = BAKURETSU;

  // Bakuretsu blast radius in game units (matches ExplosiveDamage radius in the spell).
  private static BLAST_RADIUS_GAME = 32;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const currentMana = this.character.player.mana;
    const surface = getLevel().terrain.collisionMask;

    // Collect every character in a wide area to score self + teammate damage.
    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      ...this.character.getCenter(),
      Bakuretsu.BLAST_RADIUS_GAME * 6 * 4,
      (entity) => {
        if (entity instanceof Character) everyone.push(entity);
      },
    );
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        // Bakuretsu falls from the sky and detonates wherever it hits ground
        // beneath the target's x — mirror that with probeX. If there's no ground
        // below (target is over a void), the impact lands at the bottom of the map
        // and the damage prediction falls naturally to 0.
        const targetFeetXGame = target.body.position[0] + 3;
        const targetFeetYGame = probeX(surface, targetFeetXGame);

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: (c) => this.predictDamage(c, targetFeetXGame, targetFeetYGame),
          spell: Bakuretsu.spell,
          currentMana,
        });

        if (value === null) return null;

        return {
          target: Cluster.onCharacter(target),
          value,
          to: [myNode],
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }

  /**
   * Predicted HP damage to `target` if Bakuretsu impacts at (impactXGame, impactYGame).
   * Mirrors ExplosiveDamage's distance falloff formula using Bakuretsu's spell args.
   */
  private predictDamage(target: Character, impactXGame: number, impactYGame: number): number {
    const [cxScreen, cyScreen] = target.getCenter();
    const cxGame = cxScreen / 6;
    const cyGame = cyScreen / 6;
    const dx = cxGame - impactXGame;
    const dy = cyGame - impactYGame;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const damageMultiplier = 8 * getManager().getElementValue(Element.Elemental);
    return predictExplosiveDamage(distance, Bakuretsu.BLAST_RADIUS_GAME, damageMultiplier);
  }

  protected aimPoint(): [number, number] {
    const [centerX, centerY] = this.evaluation!.target.centerScreen;
    // ±30 screen px horizontal jitter so explosions don't always land dead-center.
    const offsetX = (Math.random() - 0.5) * 60;
    return [centerX + offsetX, centerY];
  }
}
