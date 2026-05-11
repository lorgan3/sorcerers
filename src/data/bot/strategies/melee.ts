import { getSquareDistance } from "../../../util/math";
import { Command, CommandType, Key } from "../../controller/controller";
import { Character } from "../../entity/character";
import { getManager } from "../../context";
import { MELEE } from "../../spells";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { EdgeType } from "../edge";
import { Graph } from "../graph";
import { Evaluation, Strategy } from "./strategy";

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

        const damage =
          20 * (0.7 + getManager().getElementValue(Element.Physical) * 0.3);
        let value = damage >= target.hp ? 100 : 10;

        if (value !== 100) {
          const edges = graph.findEdges(
            Math.random() < 0.5 ? leftTo : rightTo,
            {
              type: EdgeType.Fall,
              maxCost: 20,
              allowedTypes: [EdgeType.Climb, EdgeType.Walk],
            }
          );

          if (edges.length > 0) {
            let edge = edges[0];
            const direction = edge.to.getDirection(leftTo);

            to = direction === -1 ? [rightTo] : [leftTo];
            value = 100;
          }
        }

        return { target: Cluster.onCharacter(target), value, to };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }

  get destinationReached() {
    const [x, y] = this.character.body.precisePosition;
    return (
      this.follower!.done ||
      (this.follower!.remainingNodes <= 2 &&
        getSquareDistance(x, y, ...this.target.position) < 200)
    );
  }

  execute(dt: number): Command[] | null {
    const targetPosition = this.evaluation!.target.position;
    return [
      { type: CommandType.ResetKeys },
      {
        type: CommandType.MouseMove,
        x: targetPosition[0] * 6,
        y: targetPosition[1] * 6,
      },
      { type: CommandType.KeyPress, key: Key.M1 },
    ];
  }
}
