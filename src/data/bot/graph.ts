import { getDistance, getSquareDistance } from "../../util/math";
import { CollisionMask } from "../collision/collisionMask";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { Terrain } from "../map/terrain";
import { probeX } from "../map/utils";
import { Edge, EdgeType } from "./edge";
import { Node, NodeType } from "./node";
import { MAX_JUMP_DISTANCE, MAX_JUMP_HEIGHT } from "./physics";

interface EdgeWithCost {
  edge: Edge;
  cost: number;
}

export class Graph {
  // Use Math.floor for a conservative upper bound: don't let the graph generate
  // jumps that exceed what the body can actually clear.
  public static JUMP_HEIGHT = Math.floor(MAX_JUMP_HEIGHT);
  public static JUMP_DISTANCE = MAX_JUMP_DISTANCE;
  public static DIAGONAL_DISTANCE = MAX_JUMP_DISTANCE + 4;

  public static FALL_LIMIT = 60;
  public static CHARACTER_HEIGHT = 16;

  public static RESOLUTION = 12;

  private nodes = new Map<string, Node>();
  private surface: CollisionMask;

  constructor(private terrain: Terrain) {
    this.surface = terrain.characterMask;
  }

  build() {
    for (let x = 0; x < this.surface.width - 6; x++) {
      let y = probeX(this.surface, x);

      // Check vertical rows
      while (y < this.surface.height) {
        let offset = 0;

        const isEdge = this.checkEdge(x, y);
        const isCheckpoint = x % Graph.RESOLUTION === 0;

        if (!isEdge && isCheckpoint) {
          while (
            offset > -16 &&
            this.surface.collidesWith(rectangle6x16, x - 3, y - 16 + offset)
          ) {
            offset--;
          }

          if (offset <= -16) {
            y = probeX(this.surface, x, y);
            continue;
          }
        }

        if (isEdge || isCheckpoint) {
          this.createNode(
            x,
            y + offset - 8,
            isEdge ? NodeType.Edge : NodeType.Regular
          );
        }

        y = probeX(this.surface, x, y);
      }
    }

    for (const ladder of this.terrain.ladders) {
      const multi = ladder.width > Graph.RESOLUTION;
      let y = Math.floor(ladder.top);
      let top = true;
      while (y < ladder.bottom) {
        if (multi) {
          for (let x = Math.floor(ladder.left); x < ladder.right; x++) {
            if (!this.surface.collidesWith(rectangle6x16, x, y)) {
              this.createNode(x, y, top ? NodeType.LadderTop : NodeType.Ladder);
              x += Graph.RESOLUTION;
            }
          }
        } else {
          let x = Math.round(ladder.horizontalCenter) - 3;
          for (let offset = 0; offset * 2 < ladder.width; offset++) {
            if (!this.surface.collidesWith(rectangle6x16, x - offset + 1, y)) {
              this.createNode(
                x - offset,
                y,
                top ? NodeType.LadderTop : NodeType.Ladder
              );

              break;
            } else if (
              !this.surface.collidesWith(rectangle6x16, x + offset + 1, y)
            ) {
              this.createNode(
                x + offset,
                y,
                top ? NodeType.LadderTop : NodeType.Ladder
              );

              break;
            }
          }
        }

        y += Graph.RESOLUTION;
        top = false;
      }
    }

    this.connectNodes();
  }

  private connectNodes() {
    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let from = nodes[i];
        let to = nodes[j];

        const xDiff = Math.abs(to.x - from.x);
        if (xDiff <= Graph.JUMP_DISTANCE) {
          let yDiff = from.y - to.y;

          if (yDiff < 0) {
            yDiff = -yDiff;
            [from, to] = [to, from];
          }

          if (this.surface.collidesWithLine(from.x, from.y, to.x, to.y)) {
            continue;
          }

          if (
            xDiff > 0 &&
            (from.type === NodeType.Regular || to.type === NodeType.Regular) &&
            Math.abs(yDiff) < Graph.RESOLUTION + 1
          ) {
            if (xDiff <= Graph.RESOLUTION + 1) {
              to.connect(from, EdgeType.Walk);
            }

            continue;
          }

          const distance = getDistance(from.x, from.y, to.x, to.y);
          if (from.type === NodeType.Ladder && to.isLadder()) {
            if (distance < Graph.DIAGONAL_DISTANCE) {
              to.connect(from, EdgeType.Climb);
            }

            continue;
          }

          if (xDiff <= 1) {
            continue;
          }

          if (from.type === NodeType.Ladder && to.type === NodeType.Ladder) {
            continue;
          }

          if (from.type === NodeType.Ladder) {
            [from, to] = [to, from];
          }

          if (
            yDiff < Graph.JUMP_HEIGHT &&
            (from.y > to.y || distance > 6) &&
            distance < Graph.DIAGONAL_DISTANCE
          ) {
            to.connect(from, EdgeType.Jump);
          } else {
            if (to.type === NodeType.Ladder) {
              // We can only fall from the middle of a ladder, too steep drops are useless, we'll just keep using the ladder in that case
              const slope = (to.y - from.y) / Math.abs(from.x - to.x);
              if (slope < 0 || slope > 1) {
                continue;
              }
            }

            to.connect(from, EdgeType.Fall);
          }
        }
      }
    }
  }

  private checkEdge(x: number, y: number) {
    return this.checkGaps(x, y) || this.checkWalls(x, y);
  }

  // Check 3 pixels down
  private checkGap(x: number, y: number, direction: number) {
    return (
      !this.surface.collidesWithPoint(x + direction, y) &&
      !this.surface.collidesWithPoint(x + direction, y + 1) &&
      !this.surface.collidesWithPoint(x + direction, y + 2)
    );
  }

  private checkGaps(x: number, y: number) {
    return this.checkGap(x, y, -1) || this.checkGap(x, y, 1);
  }

  // Check 3 pixels up
  private checkWall(x: number, y: number, direction: number) {
    return (
      this.surface.collidesWithPoint(x + direction, y - 1) &&
      this.surface.collidesWithPoint(x + direction, y - 2) &&
      this.surface.collidesWithPoint(x + direction, y - 3)
    );
  }

  private checkWalls(x: number, y: number) {
    if (
      this.checkWall(x, y, -1) &&
      !this.surface.collidesWith(rectangle6x16, x, y - 16)
    ) {
      return true;
    }

    if (
      this.checkWall(x, y, 1) &&
      !this.surface.collidesWith(rectangle6x16, x - 6, y - 16)
    ) {
      return true;
    }
  }

  private createNode(x: number, y: number, type: NodeType) {
    const node = new Node(x, y, type);
    this.nodes.set(node.toString(), node);
    return node;
  }

  getNode(x: number, y: number) {
    return this.nodes.get(Node.createKey(x, y));
  }

  getNodes() {
    return [...this.nodes.values()];
  }

  getClosestNode(x: number, y: number) {
    let closestNode: Node | null = null;
    let closestDistance = Infinity;

    this.nodes.forEach((node) => {
      const dist = getSquareDistance(x, y, node.x, node.y);
      if (dist < closestDistance) {
        closestNode = node;
        closestDistance = dist;
      }
    });

    return closestNode!;
  }

  findEdges(
    node: Node,
    options: { maxCost?: number; type: EdgeType; allowedTypes?: EdgeType[] }
  ) {
    const edges: Edge[] = [];
    const openSet = new Set<EdgeWithCost>();
    const closedSet = new Set<Node>();

    for (let edge of node.edges) {
      openSet.add({ edge, cost: 0 });
    }

    while (openSet.size > 0) {
      const currentEdge = openSet.values().next().value!;
      openSet.delete(currentEdge);
      closedSet.add(currentEdge.edge.to);

      if (currentEdge.edge.type === options.type) {
        edges.push(currentEdge.edge);
        continue;
      }

      if (
        options.allowedTypes &&
        !options.allowedTypes.includes(currentEdge.edge.type)
      ) {
        continue;
      }

      for (const edge of currentEdge.edge.to.edges) {
        const neighbor = edge.to;

        if (closedSet.has(neighbor)) {
          continue;
        }

        const cost = currentEdge.cost + edge.cost;
        if (options.maxCost && cost > options.maxCost) {
          continue;
        }

        openSet.add({ edge, cost });
      }
    }

    return edges;
  }
}
