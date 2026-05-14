import { Command, CommandType, Key } from "../../controller/controller";
import { BAKURETSU } from "../../spells";
import { getLevel } from "../../context";
import { Character } from "../../entity/character";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";

export class Bakuretsu extends RangedStrategy {
  public static spell = BAKURETSU;

  // Bakuretsu falls from the sky regardless of the bot's position — no LOS needed.
  protected requiresLineOfSight(): boolean {
    return false;
  }

  // Bakuretsu blast radius is 32 game units = 192 screen px. Allies (same player)
  // within this radius take damage. Skip targets where casting would self-friendly-fire.
  private static BLAST_RADIUS_SCREEN = 32 * 6;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myPosition = this.character.body.precisePosition;
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();

        // Friendly-fire check: any ally within blast radius of the target's center?
        let allyInBlast = false;
        getLevel().withNearbyEntities(
          targetCenter[0],
          targetCenter[1],
          Bakuretsu.BLAST_RADIUS_SCREEN,
          (entity) => {
            if (
              entity instanceof Character &&
              entity.player === this.character.player
            ) {
              allyInBlast = true;
              return true;
            }
          }
        );

        if (allyInBlast) {
          return null;
        }

        return {
          target: Cluster.onCharacter(target),
          value: 50 + Math.random() * 20,
          to: [myNode],
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
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
