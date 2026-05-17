import { Command, CommandType, Key } from "../../controller/controller";
import { BAKURETSU } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";
import { collectAllies, predictExplosiveDamage, scoreAOECandidate } from "./scoring";
import { probeX } from "../../map/utils";

export class Bakuretsu extends RangedStrategy {
  public static spell = BAKURETSU;

  // Bakuretsu falls from the sky regardless of the bot's position — no LOS needed.
  protected requiresLineOfSight(): boolean {
    return false;
  }

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

  private pressed = false;
  private castTime = 0;

  execute(dt: number): Command[] | null {
    this.castTime += dt;

    const [centerX, centerY] = this.evaluation!.target.centerScreen;

    // First call: press M1 (cursor's x maps to projectile spawn x).
    // Add a small random horizontal offset so explosions don't always land directly on
    // the target's head — gives the bot a bit of imperfection / variety.
    // The y component is irrelevant for Bakuretsu (always falls from sky).
    if (!this.pressed) {
      this.pressed = true;
      const offsetX = (Math.random() - 0.5) * 60; // ±30 screen px = ±5 game units
      return [
        { type: CommandType.ResetKeys },
        {
          type: CommandType.MouseMove,
          x: centerX + offsetX,
          y: centerY,
        },
        { type: CommandType.KeyPress, key: Key.M1 },
      ];
    }

    // Cast already issued — idle a few frames so the cursor's tick observes it, then finish.
    if (this.castTime > 5) {
      return null;
    }

    return [];
  }
}
