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

  // Bakuretsu blast radius is 32 game units = 192 screen px.
  // Use a 1.5x safety radius for friendly-fire check because the projectile
  // impacts at the ground under the target's x, which can be vertically
  // distant from the target's center if the target is airborne or on a high platform.
  private static FRIENDLY_FIRE_RADIUS_SCREEN = 32 * 6 * 1.5;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myPosition = this.character.body.precisePosition;
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        // Check around the target's FEET (sprite x+18, body bottom = body.y+16 game = +96 screen).
        // This is closer to Bakuretsu's actual impact point (ground under target's x)
        // than the body-center y.
        const targetFeetX = target.body.position[0] * 6 + 18;
        const targetFeetY = target.body.position[1] * 6 + 96;

        let allyInBlast = false;
        getLevel().withNearbyEntities(
          targetFeetX,
          targetFeetY,
          Bakuretsu.FRIENDLY_FIRE_RADIUS_SCREEN,
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
