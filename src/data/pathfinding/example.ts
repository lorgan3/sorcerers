/**
 * Example usage of the pathfinding system
 * This file demonstrates how to use the pathfinding components
 */

import { PathfindingService, PathExecutor } from "./index";
import { Character } from "../entity/character";
import { Level } from "../map/level";

/**
 * Example: Basic pathfinding setup and usage
 */
export async function exampleBasicPathfinding() {
  // Initialize the pathfinding service
  console.log("Initializing pathfinding system...");
  const pathfindingService = PathfindingService.getInstance();

  // Find a path between two points
  const start = { x: 10, y: 10 };
  const goal = { x: 50, y: 30 };

  console.log(
    `Finding path from (${start.x}, ${start.y}) to (${goal.x}, ${goal.y})`
  );
  const pathResult = pathfindingService.findPath(start, goal);

  if (pathResult.success) {
    console.log(`Path found with ${pathResult.path.length} nodes`);
    console.log(`Total cost: ${pathResult.totalCost}`);
    console.log(`Commands: ${pathResult.commands.length}`);
  } else {
    console.log("No path found");
  }

  return pathResult;
}

/**
 * Example: Using pathfinding with a character
 */
export async function exampleCharacterNavigation(
  character: Character,
  targetX: number,
  targetY: number
) {
  // Get the pathfinding service
  const pathfindingService = PathfindingService.getInstance();

  // Get character's current position
  const [charX, charY] = character.body.position;
  const start = { x: charX, y: charY };
  const goal = { x: targetX, y: targetY };

  // Check if the target is reachable
  if (!pathfindingService.isReachable(start, goal)) {
    console.log("Target is not reachable");
    return false;
  }

  // Find the path
  const pathResult = pathfindingService.findPath(start, goal);

  if (!pathResult.success) {
    console.log("Failed to find path");
    return false;
  }

  // Create a path executor for this character
  const pathExecutor = new PathExecutor(character);

  // Execute the path
  pathExecutor.executePath(
    pathResult,
    (success) => {
      if (success) {
        console.log("Character reached destination");
      } else {
        console.log("Character failed to reach destination");
      }
    },
    () => {
      console.log("Character got stuck, replanning...");
      // Could implement replanning logic here
    }
  );

  // Update the path executor every frame (this would be called in your game loop)
  const updatePathExecutor = (deltaTime: number) => {
    pathExecutor.update(deltaTime);
  };

  return { pathExecutor, updatePathExecutor };
}

/**
 * Example: Advanced pathfinding with constraints
 */
export async function exampleAdvancedPathfinding() {
  const pathfindingService = PathfindingService.getInstance();

  const start = { x: 10, y: 10 };
  const goal = { x: 50, y: 30 };

  // Find path with constraints
  const constrainedPath = pathfindingService.findPathWithConstraints(
    start,
    goal,
    {
      maxCost: 100,
      avoidMovementTypes: ["jump"], // Avoid jumping
      preferMovementTypes: ["walk"], // Prefer walking
      maxIterations: 500,
    }
  );

  if (constrainedPath.success) {
    console.log("Found path avoiding jumps");
  }

  // Find multiple alternative paths
  const alternativePaths = pathfindingService.findAlternativePaths(
    start,
    goal,
    3
  );
  console.log(`Found ${alternativePaths.length} alternative paths`);

  return { constrainedPath, alternativePaths };
}

/**
 * Example: Checking walkable positions
 */
export function exampleWalkablePositions() {
  const pathfindingService = PathfindingService.getInstance();

  // Check if a position is walkable
  const position = { x: 25, y: 25 };
  const isWalkable = pathfindingService.isWalkable(position);
  console.log(
    `Position (${position.x}, ${position.y}) is walkable: ${isWalkable}`
  );

  // Find closest walkable position
  const unwalkablePosition = { x: 0, y: 0 }; // Assuming this might be in a wall
  const closestWalkable = pathfindingService.getClosestWalkablePosition(
    unwalkablePosition,
    20
  );

  if (closestWalkable) {
    console.log(
      `Closest walkable position to (${unwalkablePosition.x}, ${unwalkablePosition.y}) is (${closestWalkable.x}, ${closestWalkable.y})`
    );
  } else {
    console.log("No walkable position found nearby");
  }

  return { isWalkable, closestWalkable };
}

/**
 * Example: Getting pathfinding statistics and debug info
 */
export function exampleDebugInfo() {
  const pathfindingService = PathfindingService.getInstance();

  // Get statistics
  const stats = pathfindingService.getStatistics();
  console.log("Pathfinding Statistics:", {
    totalNodes: stats.totalNodes,
    nodesByType: stats.nodesByType,
    totalEdges: stats.totalEdges,
    averageConnections: stats.averageConnections.toFixed(2),
    graphDensity: stats.graphDensity.toFixed(4),
  });

  // Get debug info
  const debugInfo = pathfindingService.getDebugInfo();
  console.log("Debug Info:", {
    isBuilt: debugInfo.isBuilt,
    lastUpdate: new Date(debugInfo.lastUpdate).toLocaleTimeString(),
    graphStats: debugInfo.graphStats,
  });

  // Get all nodes (for visualization)
  const allNodes = pathfindingService.getAllNodes();
  console.log(`Total nodes available: ${allNodes.length}`);

  return { stats, debugInfo, allNodes };
}

/**
 * Example: Updating the graph when terrain changes
 */
export function exampleGraphUpdate() {
  const pathfindingService = PathfindingService.getInstance();

  console.log("Updating pathfinding graph due to terrain changes...");
  pathfindingService.updateGraph();

  // Get updated statistics
  const newStats = pathfindingService.getStatistics();
  console.log("Updated graph statistics:", newStats);
}

/**
 * Example: Complete AI navigation system
 */
export class AINavigationExample {
  private character: Character;
  private pathExecutor: PathExecutor;
  private pathfindingService: PathfindingService;
  private currentTarget: { x: number; y: number } | null = null;

  constructor(character: Character) {
    this.character = character;
    this.pathExecutor = new PathExecutor(character);
    this.pathfindingService = PathfindingService.getInstance();
  }

  /**
   * Navigate to a target position
   */
  public navigateTo(x: number, y: number): boolean {
    const [charX, charY] = this.character.body.position;
    const start = { x: charX, y: charY };
    const goal = { x, y };

    // Check if target is reachable
    if (!this.pathfindingService.isReachable(start, goal)) {
      console.log("Target is not reachable");
      return false;
    }

    // Find path
    const pathResult = this.pathfindingService.findPath(start, goal);

    if (!pathResult.success) {
      console.log("Failed to find path");
      return false;
    }

    // Store target and execute path
    this.currentTarget = goal;
    this.pathExecutor.executePath(
      pathResult,
      (success) => this.onNavigationComplete(success),
      () => this.onNavigationStuck()
    );

    return true;
  }

  /**
   * Update navigation (call every frame)
   */
  public update(deltaTime: number): void {
    this.pathExecutor.update(deltaTime);
  }

  /**
   * Check if currently navigating
   */
  public isNavigating(): boolean {
    return this.pathExecutor.isExecuting();
  }

  /**
   * Stop current navigation
   */
  public stop(): void {
    this.pathExecutor.stop();
    this.currentTarget = null;
  }

  /**
   * Get navigation progress
   */
  public getProgress(): number {
    return this.pathExecutor.getProgress();
  }

  private onNavigationComplete(success: boolean): void {
    if (success) {
      console.log("AI character reached target");
    } else {
      console.log("AI character failed to reach target");
    }
    this.currentTarget = null;
  }

  private onNavigationStuck(): void {
    console.log("AI character got stuck, attempting to replan...");

    if (this.currentTarget) {
      // Try to find an alternative path
      const [charX, charY] = this.character.body.position;
      const start = { x: charX, y: charY };

      const alternativePaths = this.pathfindingService.findAlternativePaths(
        start,
        this.currentTarget,
        3
      );

      if (alternativePaths.length > 1) {
        // Use the second path (first alternative)
        console.log("Found alternative path, retrying...");
        this.pathExecutor.executePath(
          alternativePaths[1],
          (success) => this.onNavigationComplete(success),
          () => {
            console.log("Alternative path also failed");
            this.currentTarget = null;
          }
        );
      } else {
        console.log("No alternative path found");
        this.currentTarget = null;
      }
    }
  }
}
