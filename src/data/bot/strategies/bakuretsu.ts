import { Command, CommandType, Key } from "../../controller/controller";
import { BAKURETSU, getSpellCost } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";
import { collectAllies, predictExplosiveDamage, scoreCandidate } from "./scoring";

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

    const myPosition = this.character.body.precisePosition;
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);
    const currentMana = this.character.player.mana;

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
        // Impact lands at target's feet x, on the ground.
        const targetFeetXGame = target.body.position[0] + 3;
        const targetFeetYGame = target.body.position[1] + 16;

        const enemyDamage = this.predictDamage(target, targetFeetXGame, targetFeetYGame);

        let friendlyDamage = 0;
        let killsAlly = false;
        for (const ally of allies) {
          const d = this.predictDamage(ally, targetFeetXGame, targetFeetYGame);
          friendlyDamage += d;
          if (d >= ally.hp) killsAlly = true;
        }

        const value = scoreCandidate({
          enemyDamage,
          friendlyDamage,
          killsAlly,
          targetHp: target.hp,
          spellCost: getSpellCost(Bakuretsu.spell),
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
    // +5 game units: ExplosiveDamage's effective range is (nominalRadius + 5).
    // See predictExplosiveDamage JSDoc in scoring.ts.
    return predictExplosiveDamage(distance, Bakuretsu.BLAST_RADIUS_GAME + 5, damageMultiplier);
  }

  // Track how many frames we've spent in the cast sequence so we know when to finish.
  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const [centerX, centerY] = this.evaluation!.target.centerScreen;

    // Frame 1: set mouse to target's screen-x center (cursor's x maps to projectile spawn x).
    // Add a small random horizontal offset so explosions don't always land directly on
    // the target's head — gives the bot a bit of imperfection / variety.
    // The y component is irrelevant for Bakuretsu (always falls from sky).
    if (this.castFrames === 1) {
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

    // Cast already issued — release any held keys and finish.
    if (this.castFrames > 5) {
      return null;
    }

    return [];
  }
}
