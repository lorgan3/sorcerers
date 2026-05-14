import { Command, CommandType, Key } from "../../controller/controller";
import { FIREBALL } from "../../spells";
import { RangedStrategy } from "./rangedStrategy";
import { Character } from "../../entity/character";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { getLevel, getManager } from "../../context";
import { Element } from "../../spells/types";
import { collectAllies, predictExplosiveDamage, scoreAOECandidate } from "./scoring";

// PoweredArcaneCircle charges power at 0.1/tick starting from ~0.
// 50 ticks → power ≈ 5.0, near-max (5.49) — gives Fireball maximum range.
const HOLD_TICKS = 50;

// Aim slightly above the target's center to compensate for gravity drop during the
// projectile's flight. Tuned empirically — bots overshoot by a few pixels otherwise,
// but anything is better than aiming flat into the ground.
const AIM_LIFT_PIXELS = 60;

// Fireball is a short-to-medium range spell. Don't even attempt it past this distance
// (screen pixels) — the projectile arc would fall short.
const MAX_RANGE_SCREEN = 600;

// At point-blank range the arcing projectile flies past the target. Below this
// distance, prefer Melee.
const MIN_RANGE_SCREEN = 150;

export class Fireball extends RangedStrategy {
  public static spell = FIREBALL;

  protected maxRange(): number {
    return MAX_RANGE_SCREEN;
  }

  protected minRange(): number {
    return MIN_RANGE_SCREEN;
  }

  private static BLAST_RADIUS_GAME = 16;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myPosition = this.character.body.precisePosition;
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;

    // Bot is intentionally NOT excluded — point-blank fireballs land within blast
    // radius of the caster, and that self-blast should penalise the choice. Unlike
    // Zoltraak (where t=0 puts the bot on its own beam as a false positive), here
    // the bot only counts when it's geometrically within ~21 game units of the impact.
    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      myCenter[0],
      myCenter[1],
      MAX_RANGE_SCREEN,
      (entity) => {
        if (entity instanceof Character) everyone.push(entity);
      },
    );
    const allies = collectAllies(this.character, everyone);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > MAX_RANGE_SCREEN || distance < MIN_RANGE_SCREEN) return null;

        // LOS check vs terrain.
        if (
          surface.collidesWithLine(
            Math.round(myCenter[0] / 6),
            Math.round(myCenter[1] / 6),
            Math.round(targetCenter[0] / 6),
            Math.round(targetCenter[1] / 6),
          )
        ) {
          return null;
        }

        // Assume the fireball detonates at the target's center.
        const impactXGame = targetCenter[0] / 6;
        const impactYGame = targetCenter[1] / 6;

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: (c) => this.predictDamage(c, impactXGame, impactYGame),
          spell: Fireball.spell,
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
   * Predicted HP damage to `target` if the fireball detonates at (impactXGame, impactYGame).
   * Mirrors ExplosiveDamage's distance falloff using Fireball's main-explosion args
   * (see `src/data/spells/fireball.ts:102-108`).
   */
  private predictDamage(target: Character, impactXGame: number, impactYGame: number): number {
    const [cxScreen, cyScreen] = target.getCenter();
    const cxGame = cxScreen / 6;
    const cyGame = cyScreen / 6;
    const dx = cxGame - impactXGame;
    const dy = cyGame - impactYGame;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const damageMultiplier = 2 + getManager().getElementValue(Element.Arcane);
    return predictExplosiveDamage(distance, Fireball.BLAST_RADIUS_GAME, damageMultiplier);
  }

  // PoweredArcaneCircle charges power by ~0.1 * dt per tick, so total charge is
  // proportional to accumulated time, not call count. Track dt so we hold for the
  // same wall-clock duration regardless of frame rate.
  private castTime = 0;
  private released = false;

  execute(dt: number): Command[] | null {
    const justStarted = this.castTime === 0;
    this.castTime += dt;

    const [centerX, centerY] = this.evaluation!.target.centerScreen;
    const mouseX = centerX;
    const mouseY = centerY - AIM_LIFT_PIXELS;

    // Phase 1: hold M1 with mouse pointed slightly above target.
    if (this.castTime < HOLD_TICKS) {
      const commands: Command[] = [];

      if (justStarted) {
        commands.push({ type: CommandType.ResetKeys });
      }

      commands.push(
        {
          type: CommandType.MouseMove,
          x: mouseX,
          y: mouseY,
        },
        { type: CommandType.KeyDown, key: Key.M1 }
      );

      return commands;
    }

    // Phase 2: first tick past HOLD_TICKS — release M1 to fire at the charged power.
    if (!this.released) {
      this.released = true;
      return [
        { type: CommandType.KeyUp, key: Key.M1 },
        {
          type: CommandType.MouseMove,
          x: mouseX,
          y: mouseY,
        },
      ];
    }

    // Phase 3: idle so the cursor observes M1 released.
    if (this.castTime > HOLD_TICKS + 5) {
      return null;
    }

    return [];
  }
}
