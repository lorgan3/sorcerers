import { Edge, EdgeType } from "./edge";
import { MinHeap } from "./minHeap";
import { Node } from "./node";

interface AStarNode {
  node: Node;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: AStarNode | null;
  edge: Edge | null;
}

interface HeapEntry {
  aStarNode: AStarNode;
  // Snapshot of fCost at push time; differs from aStarNode.fCost once a
  // cheaper path is found, marking this entry stale.
  fCost: number;
}

export type PathResult =
  | { success: true; path: Edge[]; totalCost: number }
  | { success: false; path: undefined; totalCost: undefined };

export class Pathfinding {
  // A* with a Manhattan heuristic over Euclidean edge costs, so it runs as
  // weighted A*: fewer expansions, occasionally suboptimal paths.
  public static findPath(
    startNode: Node,
    goalNode: Node,
    maxIterations: number = 1000
  ): PathResult {
    if (!startNode || !goalNode) {
      return {
        path: undefined,
        totalCost: undefined,
        success: false,
      };
    }

    if (startNode === goalNode) {
      return {
        path: [],
        totalCost: 0,
        success: true,
      };
    }

    const openSet = new MinHeap<HeapEntry>(
      (a, b) =>
        a.fCost < b.fCost ||
        (a.fCost === b.fCost && a.aStarNode.hCost < b.aStarNode.hCost)
    );
    const closedSet = new Set<Node>();
    const nodeMap = new Map<Node, AStarNode>();

    const startAStarNode: AStarNode = {
      node: startNode,
      gCost: 0,
      hCost: this.calculateHeuristic(startNode, goalNode),
      fCost: 0,
      parent: null,
      edge: null,
    };
    startAStarNode.fCost = startAStarNode.gCost + startAStarNode.hCost;

    openSet.push({ aStarNode: startAStarNode, fCost: startAStarNode.fCost });
    nodeMap.set(startNode, startAStarNode);

    let iterations = 0;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      const entry = openSet.pop()!;
      if (entry.fCost !== entry.aStarNode.fCost) continue;

      const currentNode = entry.aStarNode;
      closedSet.add(currentNode.node);

      if (currentNode.node === goalNode) {
        const path = this.reconstructPath(currentNode);

        return {
          path,
          totalCost: currentNode.gCost,
          success: true,
        };
      }

      for (const edge of currentNode.node.edges) {
        const neighbor = edge.to;

        if (closedSet.has(neighbor)) {
          continue;
        }

        const tentativeGCost = currentNode.gCost + edge.cost;

        let neighborAStarNode = nodeMap.get(neighbor);

        if (!neighborAStarNode) {
          neighborAStarNode = {
            node: neighbor,
            edge,
            gCost: tentativeGCost,
            hCost: this.calculateHeuristic(neighbor, goalNode),
            fCost: 0,
            parent: currentNode,
          };
          neighborAStarNode.fCost =
            neighborAStarNode.gCost + neighborAStarNode.hCost;

          nodeMap.set(neighbor, neighborAStarNode);
          openSet.push({
            aStarNode: neighborAStarNode,
            fCost: neighborAStarNode.fCost,
          });
        } else if (tentativeGCost < neighborAStarNode.gCost) {
          neighborAStarNode.gCost = tentativeGCost;
          neighborAStarNode.fCost =
            neighborAStarNode.gCost + neighborAStarNode.hCost;
          neighborAStarNode.parent = currentNode;
          neighborAStarNode.edge = edge;

          openSet.push({
            aStarNode: neighborAStarNode,
            fCost: neighborAStarNode.fCost,
          });
        }
      }
    }

    return {
      path: undefined,
      totalCost: undefined,
      success: false,
    };
  }

  private static calculateHeuristic(from: Node, to: Node): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    return dx + dy;
  }

  private static reconstructPath(goalNode: AStarNode) {
    const path: Edge[] = [];
    let currentNode: AStarNode | null = goalNode;

    // Walk the parent chain backward, pushing edges in reverse, then reverse
    // once at the end. Detour edges are pushed in reverse here too so they
    // land in forward order after the final reverse.
    while (currentNode?.edge) {
      const currentEdge = currentNode.edge;
      path.push(currentEdge);
      currentNode = currentNode.parent;

      if (currentNode?.edge && currentEdge.type === EdgeType.Jump) {
        this.insertPrerollDetour(currentEdge, currentNode.edge, path);
      }
    }

    path.reverse();
    return path;
  }

  // When the path reverses direction into a jump, walk a bit further first to
  // build momentum before the jump.
  private static insertPrerollDetour(
    currentEdge: Edge,
    prevEdge: Edge,
    path: Edge[]
  ) {
    const currentDir = Math.sign(currentEdge.from.x - currentEdge.to.x);
    const newDir = Math.sign(prevEdge.from.x - prevEdge.to.x);
    if (currentDir === newDir) return;

    const extraEdge = Pathfinding.findOppositeEdge(currentEdge, currentDir);
    if (!extraEdge) return;

    const reverseEdge = extraEdge.to.edges.find(
      (edge) => edge.to === currentEdge.from
    );
    if (reverseEdge) {
      path.push(reverseEdge);
      path.push(extraEdge);
    }
  }

  private static findOppositeEdge(edge: Edge, direction: number) {
    return edge.from.edges
      .filter((edge) => Math.sign(edge.from.x - edge.to.x) !== direction)
      .sort((a, b) => {
        if (a.type === EdgeType.Walk && b.type !== EdgeType.Walk) {
          return -1;
        }

        if (b.type === EdgeType.Walk && a.type !== EdgeType.Walk) {
          return 1;
        }

        return Math.abs(b.from.x - b.to.x) - Math.abs(a.from.x - a.to.x);
      })[0];
  }
}
