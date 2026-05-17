import { Command, CommandType, Key } from "../../controller/controller";
import { ZOLTRAAK, getSpellCost } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";
import { scoreCandidate } from "./scoring";

// Hold M1 for ~60 ticks so the cursor's charge indicator becomes fully visible
// (matches a normal player cast).
const HOLD_TICKS = 60;

// Zoltraak beam length (screen px) — matches MAX_DISTANCE in spells/zoltraak.ts.
const BEAM_LENGTH_SCREEN = 912;

// Perpendicular distance (screen px) within which a character is considered "on the beam".
// The real Zoltraak hits any character with rayDistance <= 48 screen px (see
// src/data/spells/zoltraak.ts:161). Match that exactly so the bot predicts the
// same hits the engine produces.
const BEAM_HALF_WIDTH_SCREEN = 48;

export class Zoltraak extends RangedStrategy {
  public static spell = ZOLTRAAK;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const surface = getLevel().terrain.collisionMask;
    const currentMana = this.character.player.mana;

    // Collect every character on the level to score against each candidate beam.
    const allCharacters: Character[] = [];
    getLevel().withNearbyEntities(
      myCenter[0],
      myCenter[1],
      BEAM_LENGTH_SCREEN,
      (entity) => {
        // Exclude self: at t=0 isOnBeam returns true for the caster's own position,
        // which would falsely flag every Zoltraak as self-damaging. The real spell
        // does not hit its own caster.
        if (entity instanceof Character && entity !== this.character) {
          allCharacters.push(entity);
        }
      },
    );

    this.evaluations = targets
      .slice(0, 5)
      .map((target) => {
        const targetCenter = target.getCenter();

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

        // Sum damage across every character on the beam line (target + bystanders).
        let enemyDamage = 0;
        let friendlyDamage = 0;
        let killsAlly = false;

        for (const c of allCharacters) {
          if (!Zoltraak.isOnBeam(myCenter, targetCenter, c.getCenter())) continue;
          const d = this.predictDamage(c);

          if (c.player === this.character.player) {
            friendlyDamage += d;
            if (d >= c.hp) killsAlly = true;
          } else {
            enemyDamage += d;
          }
        }

        if (enemyDamage === 0) return null; // beam hits no enemies

        const value = scoreCandidate({
          enemyDamage,
          friendlyDamage,
          killsAlly,
          targetHp: target.hp,
          spellCost: getSpellCost(Zoltraak.spell),
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
   * Per-target damage for Zoltraak. GenericDamage applies a flat amount per character
   * on the beam (see `spells/zoltraak.ts:170` — `DAMAGE + getElementValue(Arcane) * 6`).
   */
  private predictDamage(_target: Character): number {
    return 35 + getManager().getElementValue(Element.Arcane) * 6;
  }

  /**
   * Is `point` within the beam fired from `from` toward and past `aimedAt`?
   * The beam is a line of length BEAM_LENGTH_SCREEN starting at `from`, oriented along
   * the (from → aimedAt) vector. A character is hit if their center is within
   * BEAM_HALF_WIDTH_SCREEN perpendicular distance AND between 0 and BEAM_LENGTH_SCREEN along
   * the beam.
   */
  static isOnBeam(
    from: [number, number],
    aimedAt: [number, number],
    point: [number, number]
  ): boolean {
    const dx = aimedAt[0] - from[0];
    const dy = aimedAt[1] - from[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      return false;
    }
    const ux = dx / len;
    const uy = dy / len;

    const px = point[0] - from[0];
    const py = point[1] - from[1];

    // Parametric position along the beam.
    const t = px * ux + py * uy;
    if (t < 0 || t > BEAM_LENGTH_SCREEN) {
      return false;
    }

    // Perpendicular distance from point to the beam line.
    const perpX = px - t * ux;
    const perpY = py - t * uy;
    return perpX * perpX + perpY * perpY <= BEAM_HALF_WIDTH_SCREEN * BEAM_HALF_WIDTH_SCREEN;
  }

  // Hold duration is wall-clock-equivalent (matches a normal player cast), so
  // accumulate dt rather than counting calls.
  private castTime = 0;
  private released = false;

  execute(dt: number): Command[] | null {
    const justStarted = this.castTime === 0;
    this.castTime += dt;

    const targetCenter = this.evaluation!.target.centerScreen;
    const mouseX = targetCenter[0];
    const mouseY = targetCenter[1];

    // Phase 1: hold M1 with mouse pointed at target so the cursor aims correctly.
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

    // Phase 2: first tick past HOLD_TICKS — release M1 so the cursor fires.
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

    // Phase 3: cast issued; idle for a few frames so the cursor's tick observes M1 released.
    if (this.castTime > HOLD_TICKS + 5) {
      return null;
    }

    return [];
  }
}
