import { Edge, EdgeType } from "./edge";
import { Node } from "./node";

interface AStarNode {
  node: Node;
  gCost: number; // Cost from start to this node
  hCost: number; // Heuristic cost from this node to goal
  fCost: number; // Total cost (g + h)
  parent: AStarNode | null;
  edge: Edge | null;
}

export type PathResult =
  | { success: true; path: Edge[]; totalCost: number }
  | { success: false; path: undefined; totalCost: undefined };

export class Pathfinding {
  /**
   * Find the optimal path between two points using A* algorithm
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

    const openSet = new Set<AStarNode>();
    const closedSet = new Set<Node>();
    const nodeMap = new Map<Node, AStarNode>();

    // Create start node
    const startAStarNode: AStarNode = {
      node: startNode,
      gCost: 0,
      hCost: this.calculateHeuristic(startNode, goalNode),
      fCost: 0,
      parent: null,
      edge: null,
    };
    startAStarNode.fCost = startAStarNode.gCost + startAStarNode.hCost;

    openSet.add(startAStarNode);
    nodeMap.set(startNode, startAStarNode);

    let iterations = 0;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest fCost
      const currentNode = this.getLowestFCostNode(openSet);
      openSet.delete(currentNode);
      closedSet.add(currentNode.node);

      // Check if we reached the goal
      if (currentNode.node === goalNode) {
        const path = this.reconstructPath(currentNode);

        return {
          path,
          totalCost: currentNode.gCost,
          success: true,
        };
      }

      // Explore neighbors
      for (const edge of currentNode.node.edges) {
        const neighbor = edge.to;

        // Skip if already evaluated
        if (closedSet.has(neighbor)) {
          continue;
        }

        const tentativeGCost = currentNode.gCost + edge.cost;

        let neighborAStarNode = nodeMap.get(neighbor);

        if (!neighborAStarNode) {
          // Create new node
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
          openSet.add(neighborAStarNode);
        } else if (tentativeGCost < neighborAStarNode.gCost) {
          // Found a better path to this neighbor
          neighborAStarNode.gCost = tentativeGCost;
          neighborAStarNode.fCost =
            neighborAStarNode.gCost + neighborAStarNode.hCost;
          neighborAStarNode.parent = currentNode;
          neighborAStarNode.edge = edge;

          // Add back to open set if it was removed
          if (!openSet.has(neighborAStarNode)) {
            openSet.add(neighborAStarNode);
          }
        }
      }
    }

    // No path found
    return {
      path: undefined,
      totalCost: undefined,
      success: false,
    };
  }

  /**
   * Calculate heuristic distance between two nodes
   * Uses Manhattan distance with some adjustments for movement type
   */
  private static calculateHeuristic(from: Node, to: Node): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Base Manhattan distance
    let heuristic = dx + dy;

    // // Add penalty for height differences (jumping/falling costs more)
    // if (dy > 0) {
    //   heuristic += dy * 2; // Vertical movement is more expensive
    // }

    // // Add penalty for different node types
    // if (from.type !== to.type) {
    //   heuristic += 5; // Transitioning between ground/ladder/air costs more
    // }

    return heuristic;
  }

  /**
   * Find the node with the lowest fCost in the open set
   */
  private static getLowestFCostNode(openSet: Set<AStarNode>): AStarNode {
    let lowestNode: AStarNode | null = null;
    let lowestFCost = Infinity;

    for (const node of openSet) {
      if (
        node.fCost < lowestFCost ||
        (node.fCost === lowestFCost &&
          node.hCost < (lowestNode?.hCost ?? Infinity))
      ) {
        lowestFCost = node.fCost;
        lowestNode = node;
      }
    }

    return lowestNode!;
  }

  /**
   * Reconstruct the path from goal to start
   */
  private static reconstructPath(goalNode: AStarNode) {
    const path: Edge[] = [];
    let currentNode: AStarNode | null = goalNode;

    while (currentNode?.edge) {
      const currentEdge = currentNode.edge;
      path.unshift(currentEdge);
      currentNode = currentNode.parent;

      // If the direction changed, try first walking a bit further to build momentum for the upcoming jump.
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
            path.unshift(
              extraEdge.to.edges.find((edge) => edge.to === currentEdge.from)!
            );
            path.unshift(extraEdge);
          }
        }
      }
    }

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
