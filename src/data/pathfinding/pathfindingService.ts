import { Level } from "../map/level";
import { TerrainGraphOptimized } from "./terrainGraphOptimized";
import { AStar } from "./aStar";
import { PathNode, PathResult, Point, TerrainGraphOptions } from "./types";

export class PathfindingService {
  private static _instance: PathfindingService;
  private terrainGraph: TerrainGraphOptimized;
  private isGraphBuilt = false;
  private lastTerrainUpdate = 0;

  private constructor(options?: TerrainGraphOptions) {
    this.terrainGraph = new TerrainGraphOptimized(options);
  }

  /**
   * Get the singleton instance of the pathfinding service
   */
  public static getInstance(options?: TerrainGraphOptions): PathfindingService {
    if (!PathfindingService._instance) {
      PathfindingService._instance = new PathfindingService(options);
    }
    return PathfindingService._instance;
  }

  /**
   * Initialize the pathfinding service and build the initial graph
   */
  public async initialize(): Promise<void> {
    console.log("Initializing pathfinding service...");

    // Wait for level to be ready
    if (!Level.instance) {
      throw new Error("Level instance not available for pathfinding");
    }

    // Build the initial graph
    await this.updateGraph();
    console.log("Pathfinding service initialized");
  }

  /**
   * Find a path between two points
   */
  public findPath(start: Point, goal: Point): PathResult {
    if (!this.isGraphBuilt) {
      console.warn("Graph not built yet, building now...");
      this.updateGraph();
    }

    // Find closest nodes to start and goal positions
    const startNode = this.terrainGraph.getClosestNode(start.x, start.y);
    const goalNode = this.terrainGraph.getClosestNode(goal.x, goal.y);

    if (!startNode) {
      console.warn("No valid start node found near", start);
      return {
        path: [],
        commands: [],
        totalCost: 0,
        success: false,
      };
    }

    if (!goalNode) {
      console.warn("No valid goal node found near", goal);
      return {
        path: [],
        commands: [],
        totalCost: 0,
        success: false,
      };
    }

    // Use A* to find the path
    const result = AStar.findPath(startNode, goalNode);

    if (result.success) {
      console.log(
        `Path found with ${result.path.length} nodes, cost: ${result.totalCost}`
      );
    } else {
      console.warn("No path found between", start, "and", goal);
    }

    return result;
  }

  /**
   * Find a path with specific constraints
   */
  public findPathWithConstraints(
    start: Point,
    goal: Point,
    options: {
      maxCost?: number;
      avoidMovementTypes?: string[];
      preferMovementTypes?: string[];
      maxIterations?: number;
    } = {}
  ): PathResult {
    if (!this.isGraphBuilt) {
      this.updateGraph();
    }

    const startNode = this.terrainGraph.getClosestNode(start.x, start.y);
    const goalNode = this.terrainGraph.getClosestNode(goal.x, goal.y);

    if (!startNode || !goalNode) {
      return {
        path: [],
        commands: [],
        totalCost: 0,
        success: false,
      };
    }

    return AStar.findPathWithConstraints(startNode, goalNode, options);
  }

  /**
   * Find multiple alternative paths
   */
  public findAlternativePaths(
    start: Point,
    goal: Point,
    numPaths: number = 3
  ): PathResult[] {
    if (!this.isGraphBuilt) {
      this.updateGraph();
    }

    const startNode = this.terrainGraph.getClosestNode(start.x, start.y);
    const goalNode = this.terrainGraph.getClosestNode(goal.x, goal.y);

    if (!startNode || !goalNode) {
      return [];
    }

    return AStar.findAlternativePaths(startNode, goalNode, numPaths);
  }

  /**
   * Check if a target position is reachable from a start position
   */
  public isReachable(start: Point, goal: Point): boolean {
    if (!this.isGraphBuilt) {
      this.updateGraph();
    }

    const startNode = this.terrainGraph.getClosestNode(start.x, start.y);
    const goalNode = this.terrainGraph.getClosestNode(goal.x, goal.y);

    if (!startNode || !goalNode) {
      return false;
    }

    // Use a quick pathfinding check with limited iterations
    const result = AStar.findPath(startNode, goalNode, 100);
    return result.success;
  }

  /**
   * Check if a position is walkable
   */
  public isWalkable(position: Point): boolean {
    return this.terrainGraph.isWalkable(position.x, position.y);
  }

  /**
   * Get the closest walkable position to a given point
   */
  public getClosestWalkablePosition(
    position: Point,
    maxDistance: number = 20
  ): Point | null {
    // First check if the position itself is walkable
    if (this.isWalkable(position)) {
      return position;
    }

    // Search in expanding circles
    for (let radius = 1; radius <= maxDistance; radius++) {
      for (let angle = 0; angle < 360; angle += 15) {
        const radians = (angle * Math.PI) / 180;
        const x = Math.round(position.x + Math.cos(radians) * radius);
        const y = Math.round(position.y + Math.sin(radians) * radius);

        if (this.isWalkable({ x, y })) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Update the terrain graph (call when terrain changes)
   */
  public updateGraph(): void {
    console.log("Updating pathfinding graph...");
    const startTime = performance.now();

    this.terrainGraph.buildGraph();
    this.isGraphBuilt = true;
    this.lastTerrainUpdate = Date.now();

    const endTime = performance.now();
    console.log(`Graph updated in ${(endTime - startTime).toFixed(2)}ms`);

    const debugInfo = this.terrainGraph.getDebugInfo();
    console.log("Graph stats:", debugInfo);
  }

  /**
   * Get debug information about the current graph
   */
  public getDebugInfo(): {
    isBuilt: boolean;
    lastUpdate: number;
    graphStats: any;
  } {
    return {
      isBuilt: this.isGraphBuilt,
      lastUpdate: this.lastTerrainUpdate,
      graphStats: this.isGraphBuilt ? this.terrainGraph.getDebugInfo() : null,
    };
  }

  /**
   * Get all nodes in the graph (for debugging/visualization)
   */
  public getAllNodes(): PathNode[] {
    if (!this.isGraphBuilt) {
      return [];
    }
    return this.terrainGraph.getNodes();
  }

  /**
   * Find the nearest node to a position
   */
  public getNearestNode(position: Point): PathNode | null {
    if (!this.isGraphBuilt) {
      return null;
    }
    return this.terrainGraph.getClosestNode(position.x, position.y);
  }

  /**
   * Get nodes within a certain radius of a position
   */
  public getNodesInRadius(center: Point, radius: number): PathNode[] {
    if (!this.isGraphBuilt) {
      return [];
    }

    const nodes = this.terrainGraph.getNodes();
    const radiusSquared = radius * radius;

    return nodes.filter((node) => {
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      return dx * dx + dy * dy <= radiusSquared;
    });
  }

  /**
   * Estimate the cost to travel between two points
   */
  public estimateCost(start: Point, goal: Point): number {
    const dx = Math.abs(goal.x - start.x);
    const dy = Math.abs(goal.y - start.y);

    // Simple heuristic based on Manhattan distance
    // with penalties for vertical movement
    return dx + dy * 1.5;
  }

  /**
   * Check if the graph needs updating based on terrain changes
   */
  public needsUpdate(): boolean {
    // This could be enhanced to detect actual terrain changes
    // For now, we'll assume the graph is valid for a reasonable time
    const timeSinceUpdate = Date.now() - this.lastTerrainUpdate;
    return timeSinceUpdate > 30000; // 30 seconds
  }

  /**
   * Force a graph rebuild
   */
  public forceRebuild(): void {
    this.isGraphBuilt = false;
    this.updateGraph();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.isGraphBuilt = false;
    // Clear any cached data
  }

  /**
   * Get pathfinding statistics
   */
  public getStatistics(): {
    totalNodes: number;
    nodesByType: Record<string, number>;
    totalEdges: number;
    averageConnections: number;
    graphDensity: number;
  } {
    if (!this.isGraphBuilt) {
      return {
        totalNodes: 0,
        nodesByType: {},
        totalEdges: 0,
        averageConnections: 0,
        graphDensity: 0,
      };
    }

    const debugInfo = this.terrainGraph.getDebugInfo();
    const totalNodes = debugInfo.nodeCount;
    const totalEdges = debugInfo.edgeCount;

    return {
      totalNodes,
      nodesByType: debugInfo.nodesByType,
      totalEdges,
      averageConnections: totalNodes > 0 ? totalEdges / totalNodes : 0,
      graphDensity:
        totalNodes > 0 ? totalEdges / (totalNodes * (totalNodes - 1)) : 0,
    };
  }

  /**
   * Validate a path to ensure it's still valid
   */
  public validatePath(path: PathNode[]): boolean {
    if (path.length < 2) {
      return true; // Single node or empty path is valid
    }

    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i];
      const nextNode = path[i + 1];

      // Check if there's still a connection between these nodes
      const hasConnection = currentNode.connections.some(
        (edge) => edge.target === nextNode
      );

      if (!hasConnection) {
        return false;
      }
    }

    return true;
  }
}
