import { getSquareDistance } from "../../../util/math";
import { Command, CommandType, Key } from "../../controller/controller";
import { Character } from "../../entity/character";
import { getManager } from "../../context";
import { MELEE, getSpellCost } from "../../spells";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { EdgeType } from "../edge";
import { Graph } from "../graph";
import { Evaluation, Strategy } from "./strategy";
import { scoreCandidate } from "./scoring";

export class Melee extends Strategy {
  public static spell = MELEE;

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;

    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetPosition = target.body.position;
        let leftTo = graph.getClosestNode(
          targetPosition[0],
          targetPosition[1] + 8
        );
        let rightTo = graph.getClosestNode(
          targetPosition[0] + 6,
          targetPosition[1] + 8
        );

        let to = leftTo === rightTo ? [leftTo] : [leftTo, rightTo];

        const y = targetPosition[1];
        if (
          to.some((to) => {
            if (Math.abs(to.y - 8 - y) > 10) {
              return true;
            }

            return false;
          })
        ) {
          return null;
        }

        const damage = this.predictDamage(target);
        const currentMana = this.character.player.mana;

        // Melee has no AOE — friendly damage is always 0.
        const value = scoreCandidate({
          enemyDamage: damage,
          friendlyDamage: 0,
          killsAlly: false,
          targetHp: target.hp,
          spellCost: getSpellCost(Melee.spell),
          currentMana,
        });

        if (value === null) return null;

        // Preserve the existing "fall off ledge for a kill shot" behavior:
        // if not a kill from the safe tile, look for a falling approach.
        if (damage < target.hp) {
          const edges = graph.findEdges(
            Math.random() < 0.5 ? leftTo : rightTo,
            {
              type: EdgeType.Fall,
              maxCost: 20,
              allowedTypes: [EdgeType.Climb, EdgeType.Walk],
            },
          );

          if (edges.length > 0) {
            let edge = edges[0];
            const direction = edge.to.getDirection(leftTo);

            to = direction === -1 ? [rightTo] : [leftTo];
          }
        }

        return { target: Cluster.onCharacter(target), value, to };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }

  private predictDamage(_target: Character): number {
    return 20 * (0.7 + getManager().getElementValue(Element.Physical) * 0.3);
  }

  get destinationReached() {
    const [x, y] = this.character.body.precisePosition;
    return (
      this.follower!.done ||
      (this.follower!.remainingNodes <= 2 &&
        getSquareDistance(x, y, ...this.target.position) < 200)
    );
  }

  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;
    const targetPosition = this.evaluation!.target.position;
    const mouseX = targetPosition[0] * 6;
    const mouseY = targetPosition[1] * 6;

    // Frame 1: clear lingering keys and aim at target so the character
    // updates its look direction in this tick's controlContinuous.
    if (this.castFrames === 1) {
      return [
        { type: CommandType.ResetKeys },
        { type: CommandType.MouseMove, x: mouseX, y: mouseY },
      ];
    }

    // Frame 2: swing. lookDirection has now been updated from the new mouse position.
    if (this.castFrames === 2) {
      return [
        { type: CommandType.MouseMove, x: mouseX, y: mouseY },
        { type: CommandType.KeyPress, key: Key.M1 },
      ];
    }

    // Frame 3+: done.
    if (this.castFrames > 5) {
      return null;
    }

    return [];
  }
}
