import { Edge, EdgeType } from "./edge";
import { MinHeap } from "./minHeap";
import { Node } from "./node";

interface AStarNode {
  node: Node;
  gCost: number; // Cost from start to this node
  hCost: number; // Heuristic cost from this node to goal
  fCost: number; // Total cost (g + h)
  parent: AStarNode | null;
  edge: Edge | null;
}

interface HeapEntry {
  aStarNode: AStarNode;
  // Snapshot of fCost at push time. The canonical fCost lives on the
  // AStarNode and may have improved since this entry was pushed. On pop,
  // entries whose snapshot disagrees with the canonical fCost are stale.
  fCost: number;
}

export type PathResult =
  | { success: true; path: Edge[]; totalCost: number }
  | { success: false; path: undefined; totalCost: undefined };

export class Pathfinding {
  /**
   * Find a path between two nodes using A* with a Manhattan heuristic.
   * Edge cost is Euclidean (see edge.ts), so the heuristic is mildly
   * inadmissible — A* runs as weighted A* (fewer expansions, paths
   * occasionally suboptimal).
   */
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
      // Stale-entry skip: the AStarNode's fCost improved since this entry
      // was pushed. The improved entry was pushed separately and will be
      // popped (or already was) in the correct order.
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

          // Push a fresh entry at the new (lower) fCost. The previous
          // entry, if still on the heap, becomes stale and is skipped.
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

  /**
   * Reconstruct the path from goal to start.
   *
   * Walks the parent chain backward and pushes edges in reverse order
   * (O(1) per push), then reverses once at the end. The preroll detour
   * is also pushed in reverse (currentEdge → reverseEdge → extraEdge),
   * which yields the correct forward order [extraEdge, reverseEdge,
   * currentEdge, ...] after the final reverse.
   */
  private static reconstructPath(goalNode: AStarNode) {
    const path: Edge[] = [];
    let currentNode: AStarNode | null = goalNode;

    while (currentNode?.edge) {
      const currentEdge = currentNode.edge;
      path.push(currentEdge);
      currentNode = currentNode.parent;

      // If the direction changed, try first walking a bit further to build
      // momentum for the upcoming jump.
      if (currentNode?.edge && currentEdge.type === EdgeType.Jump) {
        const currentDir = Math.sign(currentEdge.from.x - currentEdge.to.x);
        const newDir = Math.sign(
          currentNode.edge.from.x - currentNode.edge.to.x
        );
        if (currentDir !== newDir) {
          const extraEdge = Pathfinding.findOppositeEdge(
            currentEdge,
            currentDir
          );

          if (extraEdge) {
            const reverseEdge = extraEdge.to.edges.find(
              (edge) => edge.to === currentEdge.from
            )!;
            // Push in reverse-of-forward order; the final reverse() flips it
            // back to [extraEdge, reverseEdge, currentEdge, ...].
            path.push(reverseEdge);
            path.push(extraEdge);
          }
        }
      }
    }

    path.reverse();
    return path;
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
