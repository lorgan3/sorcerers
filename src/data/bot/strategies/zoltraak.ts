import { Command, CommandType, Key } from "../../controller/controller";
import { ZOLTRAAK } from "../../spells";
import { getLevel } from "../../context";
import { Character } from "../../entity/character";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";

// Hold M1 for ~60 ticks so the cursor's charge indicator becomes fully visible
// (matches a normal player cast).
const HOLD_TICKS = 60;

// Zoltraak beam length (screen px) — matches MAX_DISTANCE in spells/zoltraak.ts.
const BEAM_LENGTH = 912;

// Perpendicular distance (screen px) within which a character is considered "on the beam".
// Zoltraak's widest tool is rotatedRectangle6x24 — beam is 6 game units = 36 screen px
// wide. Use half-width + a small margin so we generously avoid friendly fire.
const BEAM_HALF_WIDTH = 24;

export class Zoltraak extends RangedStrategy {
  public static spell = ZOLTRAAK;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myCenter = this.character.getCenter();
    const myPosition = this.character.body.precisePosition;
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);
    const surface = getLevel().terrain.collisionMask;

    // Collect every character on the level to score against each candidate beam.
    const allCharacters: Character[] = [];
    getLevel().withNearbyEntities(
      myCenter[0],
      myCenter[1],
      BEAM_LENGTH,
      (entity) => {
        if (entity instanceof Character && entity !== this.character) {
          allCharacters.push(entity);
        }
      }
    );

    this.evaluations = targets
      .slice(0, 5)
      .map((target) => {
        const targetCenter = target.getCenter();

        // LOS check vs terrain (skips line through walls).
        if (
          surface.collidesWithLine(
            Math.round(myCenter[0] / 6),
            Math.round(myCenter[1] / 6),
            Math.round(targetCenter[0] / 6),
            Math.round(targetCenter[1] / 6)
          )
        ) {
          return null;
        }

        // For every other character, is it on the beam line from bot to (and past) target?
        let enemiesHit = 1; // target itself counts
        let allyOnBeam = false;
        for (const other of allCharacters) {
          if (other === target) continue;
          if (
            this.isOnBeam(myCenter, targetCenter, other.getCenter())
          ) {
            if (other.player === this.character.player) {
              allyOnBeam = true;
              break;
            }
            enemiesHit++;
          }
        }

        if (allyOnBeam) {
          return null;
        }

        // Reward beams that hit multiple enemies. Base 50 + 25 per extra enemy + jitter.
        const value = 50 + (enemiesHit - 1) * 25 + Math.random() * 10;

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
   * Is `point` within the beam fired from `from` toward and past `aimedAt`?
   * The beam is a line of length BEAM_LENGTH starting at `from`, oriented along
   * the (from → aimedAt) vector. A character is hit if their center is within
   * BEAM_HALF_WIDTH perpendicular distance AND between 0 and BEAM_LENGTH along
   * the beam.
   */
  private isOnBeam(
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
    if (t < 0 || t > BEAM_LENGTH) {
      return false;
    }

    // Perpendicular distance from point to the beam line.
    const perpX = px - t * ux;
    const perpY = py - t * uy;
    return perpX * perpX + perpY * perpY <= BEAM_HALF_WIDTH * BEAM_HALF_WIDTH;
  }

  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const targetCenter = this.evaluation!.target.centerScreen;
    const mouseX = targetCenter[0];
    const mouseY = targetCenter[1];

    // Phase 1: hold M1 with mouse pointed at target so the cursor aims correctly.
    if (this.castFrames <= HOLD_TICKS) {
      const commands: Command[] = [];

      if (this.castFrames === 1) {
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

    // Phase 2: release M1 → cursor fires.
    if (this.castFrames === HOLD_TICKS + 1) {
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
    if (this.castFrames > HOLD_TICKS + 5) {
      return null;
    }

    return [];
  }
}
