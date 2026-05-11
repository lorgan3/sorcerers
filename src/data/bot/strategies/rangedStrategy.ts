import { Character } from "../../entity/character";
import { getLevel } from "../../context";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation, Strategy } from "./strategy";

export abstract class RangedStrategy extends Strategy {
  /**
   * Whether this spell requires line-of-sight from the bot's center to the target.
   * Defaults to true. Spells that strike from above (e.g. Bakuretsu) override to false.
   */
  protected requiresLineOfSight(): boolean {
    return true;
  }

  /**
   * Maximum useful cast distance in game units (precise position, not screen pixels).
   * Subclasses override to reflect projectile reach. Defaults to a generous 1000.
   */
  protected maxRange(): number {
    return 1000;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    const myPosition = this.character.body.precisePosition;
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(myPosition[0] + 3, myPosition[1] + 8);

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.maxRange()) {
          return null;
        }

        if (this.requiresLineOfSight()) {
          // Line of sight is checked in the terrain's "characterMask" coordinate space,
          // which is game units (1/6 of screen pixels). Centers are in screen units.
          const surface = getLevel().terrain.characterMask;
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
        }

        // Damage-based heuristic value: prefer kill shots over scratches.
        // Real scoring lives in M4; this is just enough to make the strategy
        // bid against Melee.
        const value = 50;

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

  get destinationReached(): boolean {
    // Ranged strategies cast from the bot's current position — the path is empty
    // (or trivially short), so "destination" is reached as soon as we get here.
    return !this.follower || this.follower.done;
  }
}
