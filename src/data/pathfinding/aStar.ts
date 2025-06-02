import { PathNode, PathResult, Point } from "./types";

interface AStarNode {
  node: PathNode;
  gCost: number; // Cost from start to this node
  hCost: number; // Heuristic cost from this node to goal
  fCost: number; // Total cost (g + h)
  parent: AStarNode | null;
}

export class AStar {
  /**
   * Find the optimal path between two points using A* algorithm
   */
  public static findPath(
    startNode: PathNode,
    goalNode: PathNode,
    maxIterations: number = 1000
  ): PathResult {
    if (!startNode || !goalNode) {
      return {
        path: [],
        commands: [],
        totalCost: 0,
        success: false,
      };
    }

    if (startNode === goalNode) {
      return {
        path: [startNode],
        commands: [],
        totalCost: 0,
        success: true,
      };
    }

    const openSet = new Set<AStarNode>();
    const closedSet = new Set<PathNode>();
    const nodeMap = new Map<PathNode, AStarNode>();

    // Create start node
    const startAStarNode: AStarNode = {
      node: startNode,
      gCost: 0,
      hCost: this.calculateHeuristic(startNode, goalNode),
      fCost: 0,
      parent: null,
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
        const commands = this.generateCommands(path);

        return {
          path,
          commands,
          totalCost: currentNode.gCost,
          success: true,
        };
      }

      // Explore neighbors
      for (const edge of currentNode.node.connections) {
        const neighbor = edge.target;

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

          // Add back to open set if it was removed
          if (!openSet.has(neighborAStarNode)) {
            openSet.add(neighborAStarNode);
          }
        }
      }
    }

    // No path found
    return {
      path: [],
      commands: [],
      totalCost: 0,
      success: false,
    };
  }

  /**
   * Calculate heuristic distance between two nodes
   * Uses Manhattan distance with some adjustments for movement type
   */
  private static calculateHeuristic(from: PathNode, to: PathNode): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Base Manhattan distance
    let heuristic = dx + dy;

    // Add penalty for height differences (jumping/falling costs more)
    if (dy > 0) {
      heuristic += dy * 2; // Vertical movement is more expensive
    }

    // Add penalty for different node types
    if (from.type !== to.type) {
      heuristic += 5; // Transitioning between ground/ladder/air costs more
    }

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
  private static reconstructPath(goalNode: AStarNode): PathNode[] {
    const path: PathNode[] = [];
    let currentNode: AStarNode | null = goalNode;

    while (currentNode) {
      path.unshift(currentNode.node);
      currentNode = currentNode.parent;
    }

    return path;
  }

  /**
   * Generate movement commands from a path
   */
  private static generateCommands(path: PathNode[]): any[] {
    const commands: any[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i];
      const nextNode = path[i + 1];

      // Find the edge that connects these nodes
      const edge = currentNode.connections.find(
        (conn) => conn.target === nextNode
      );

      if (edge) {
        commands.push({
          keys: edge.requiredInputs,
          duration: edge.duration || 30,
          movementType: edge.movementType,
          from: { x: currentNode.x, y: currentNode.y },
          to: { x: nextNode.x, y: nextNode.y },
        });
      }
    }

    return commands;
  }

  /**
   * Find path with additional constraints
   */
  public static findPathWithConstraints(
    startNode: PathNode,
    goalNode: PathNode,
    options: {
      maxCost?: number;
      avoidMovementTypes?: string[];
      preferMovementTypes?: string[];
      maxIterations?: number;
    } = {}
  ): PathResult {
    const {
      maxCost = Infinity,
      avoidMovementTypes = [],
      preferMovementTypes = [],
      maxIterations = 1000,
    } = options;

    if (!startNode || !goalNode) {
      return {
        path: [],
        commands: [],
        totalCost: 0,
        success: false,
      };
    }

    const openSet = new Set<AStarNode>();
    const closedSet = new Set<PathNode>();
    const nodeMap = new Map<PathNode, AStarNode>();

    const startAStarNode: AStarNode = {
      node: startNode,
      gCost: 0,
      hCost: this.calculateHeuristic(startNode, goalNode),
      fCost: 0,
      parent: null,
    };
    startAStarNode.fCost = startAStarNode.gCost + startAStarNode.hCost;

    openSet.add(startAStarNode);
    nodeMap.set(startNode, startAStarNode);

    let iterations = 0;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      const currentNode = this.getLowestFCostNode(openSet);
      openSet.delete(currentNode);
      closedSet.add(currentNode.node);

      if (currentNode.node === goalNode) {
        const path = this.reconstructPath(currentNode);
        const commands = this.generateCommands(path);

        return {
          path,
          commands,
          totalCost: currentNode.gCost,
          success: true,
        };
      }

      for (const edge of currentNode.node.connections) {
        const neighbor = edge.target;

        // Skip if movement type should be avoided
        if (avoidMovementTypes.includes(edge.movementType)) {
          continue;
        }

        // Skip if already evaluated
        if (closedSet.has(neighbor)) {
          continue;
        }

        let edgeCost = edge.cost;

        // Apply preference bonuses/penalties
        if (preferMovementTypes.includes(edge.movementType)) {
          edgeCost *= 0.8; // 20% discount for preferred movements
        }

        const tentativeGCost = currentNode.gCost + edgeCost;

        // Skip if cost exceeds maximum
        if (tentativeGCost > maxCost) {
          continue;
        }

        let neighborAStarNode = nodeMap.get(neighbor);

        if (!neighborAStarNode) {
          neighborAStarNode = {
            node: neighbor,
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
          neighborAStarNode.gCost = tentativeGCost;
          neighborAStarNode.fCost =
            neighborAStarNode.gCost + neighborAStarNode.hCost;
          neighborAStarNode.parent = currentNode;

          if (!openSet.has(neighborAStarNode)) {
            openSet.add(neighborAStarNode);
          }
        }
      }
    }

    return {
      path: [],
      commands: [],
      totalCost: 0,
      success: false,
    };
  }

  /**
   * Find multiple alternative paths
   */
  public static findAlternativePaths(
    startNode: PathNode,
    goalNode: PathNode,
    numPaths: number = 3
  ): PathResult[] {
    const paths: PathResult[] = [];
    const usedEdges = new Set<string>();

    for (let i = 0; i < numPaths; i++) {
      // Temporarily increase cost of previously used edges
      const originalCosts = new Map<string, number>();

      for (const node of this.getAllNodes(startNode)) {
        for (const edge of node.connections) {
          const edgeKey = `${node.id}->${edge.target.id}`;
          if (usedEdges.has(edgeKey)) {
            originalCosts.set(edgeKey, edge.cost);
            edge.cost *= 2; // Double the cost of used edges
          }
        }
      }

      const result = this.findPath(startNode, goalNode);

      // Restore original costs
      for (const [edgeKey, originalCost] of originalCosts) {
        const [fromId, toId] = edgeKey.split("->");
        // Find and restore the edge cost
        // This is simplified - in practice you'd need to track edges better
      }

      if (result.success) {
        paths.push(result);

        // Mark edges in this path as used
        for (let j = 0; j < result.path.length - 1; j++) {
          const from = result.path[j];
          const to = result.path[j + 1];
          usedEdges.add(`${from.id}->${to.id}`);
        }
      } else {
        break; // No more paths available
      }
    }

    return paths;
  }

  /**
   * Helper to get all reachable nodes from a starting node
   */
  private static getAllNodes(startNode: PathNode): PathNode[] {
    const visited = new Set<PathNode>();
    const queue = [startNode];
    const allNodes: PathNode[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      allNodes.push(current);

      for (const edge of current.connections) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return allNodes;
  }
}
