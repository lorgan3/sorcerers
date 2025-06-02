# Advanced Pathfinding System for Sorcerers Game

This pathfinding system provides intelligent navigation for AI bots in the sorcerers game, supporting all character movement types including walking, jumping, and ladder climbing.

## Overview

The pathfinding system consists of several key components:

- **TerrainGraph**: Analyzes the game terrain and builds a navigable graph
- **AStar**: Implements the A\* pathfinding algorithm
- **PathfindingService**: High-level interface for pathfinding operations
- **PathExecutor**: Converts paths into controller inputs for character movement

## Quick Start

```typescript
import { PathfindingUtils, PathExecutor } from "./data/pathfinding";

// Initialize the pathfinding system
await PathfindingUtils.initialize();

// Find a path between two points
const start = { x: 10, y: 10 };
const goal = { x: 50, y: 30 };
const pathResult = PathfindingUtils.findPath(start, goal);

if (pathResult.success) {
  console.log(`Path found with ${pathResult.path.length} nodes`);

  // Execute the path with a character
  const pathExecutor = new PathExecutor(character);
  pathExecutor.executePath(pathResult, (success) => {
    console.log(
      success ? "Reached destination" : "Failed to reach destination"
    );
  });
}
```

## Components

### TerrainGraph

Analyzes the game terrain and creates a graph of navigable positions:

```typescript
import { TerrainGraph } from "./data/pathfinding";

const graph = new TerrainGraph({
  jumpHeight: 16, // Maximum jump height
  jumpDistance: 8, // Maximum horizontal jump distance
  walkSpeed: 0.08, // Walking speed for cost calculation
  jumpCost: 10, // Base cost for jumping
  climbCost: 5, // Base cost for climbing
  fallCost: 1, // Base cost for falling
});

graph.buildGraph();
```

### PathfindingService

High-level interface for pathfinding operations:

```typescript
import { PathfindingService } from "./data/pathfinding";

const service = PathfindingService.getInstance();

// Find a basic path
const pathResult = service.findPath(start, goal);

// Find path with constraints
const constrainedPath = service.findPathWithConstraints(start, goal, {
  maxCost: 100,
  avoidMovementTypes: ["jump"],
  preferMovementTypes: ["walk"],
});

// Find multiple alternative paths
const alternatives = service.findAlternativePaths(start, goal, 3);

// Check if position is reachable
const isReachable = service.isReachable(start, goal);
```

### PathExecutor

Executes paths by converting them into controller inputs:

```typescript
import { PathExecutor } from "./data/pathfinding";

const executor = new PathExecutor(character);

executor.executePath(
  pathResult,
  (success) => {
    // Called when path execution completes
    console.log(success ? "Success" : "Failed");
  },
  () => {
    // Called when character gets stuck
    console.log("Character is stuck, replanning...");
  }
);

// Update every frame
executor.update(deltaTime);
```

## Movement Types

The pathfinding system supports all character movement types:

### Walking

- Horizontal movement on solid ground
- Uses Left/Right arrow keys
- Low cost, reliable movement

### Jumping

- Vertical and horizontal movement with physics constraints
- Uses Up arrow key + directional keys
- Higher cost, allows reaching elevated positions

### Ladder Climbing

- Vertical movement on ladder tiles
- Uses Up/Down arrow keys
- Medium cost, connects different height levels

### Falling

- Gravity-based movement
- No input required
- Low cost, automatic movement

## Graph Structure

The terrain graph consists of nodes and edges:

```typescript
interface PathNode {
  x: number; // Grid position
  y: number; // Grid position
  type: "ground" | "ladder" | "air";
  connections: PathEdge[];
  id: string; // Unique identifier
}

interface PathEdge {
  target: PathNode;
  movementType: "walk" | "jump" | "climb" | "fall";
  cost: number; // Movement cost for A*
  requiredInputs: Key[]; // Keys needed to execute movement
  duration?: number; // Estimated time to complete
}
```

## AI Integration Example

```typescript
import { AINavigationExample } from "./data/pathfinding/example";

class AIBot {
  private navigation: AINavigationExample;

  constructor(character: Character) {
    this.navigation = new AINavigationExample(character);
  }

  // Navigate to a target
  moveTo(x: number, y: number) {
    return this.navigation.navigateTo(x, y);
  }

  // Update in game loop
  update(deltaTime: number) {
    this.navigation.update(deltaTime);
  }

  // Check if moving
  isMoving() {
    return this.navigation.isNavigating();
  }

  // Stop movement
  stop() {
    this.navigation.stop();
  }
}
```

## Performance Considerations

### Graph Caching

- The terrain graph is cached between frames
- Only rebuilds when terrain changes
- Spatial partitioning for large maps

### Real-time Constraints

- Pathfinding is limited to prevent frame drops
- Asynchronous pathfinding for complex routes
- Progressive path refinement

### Memory Usage

- Efficient node and edge storage
- Garbage collection friendly
- Configurable graph density

## Configuration

### Physics Constants

The system uses physics constants from the character system:

```typescript
export const PHYSICS_CONSTANTS = {
  GRAVITY: 0.2,
  JUMP_STRENGTH: 3.3,
  SPEED: 0.08,
  LADDER_SPEED: 0.6,
  CHARACTER_WIDTH: 6,
  CHARACTER_HEIGHT: 16,
  MAX_JUMP_HEIGHT: 16,
  MAX_JUMP_DISTANCE: 8,
};
```

### Graph Options

Customize graph generation:

```typescript
const options: TerrainGraphOptions = {
  jumpHeight: 20, // Increase jump reach
  jumpDistance: 10, // Increase horizontal jump distance
  walkSpeed: 0.1, // Faster walking
  jumpCost: 15, // Make jumping more expensive
  climbCost: 3, // Make climbing cheaper
  fallCost: 0.5, // Make falling very cheap
};
```

## Debugging

### Statistics

Get pathfinding statistics:

```typescript
const stats = service.getStatistics();
console.log({
  totalNodes: stats.totalNodes,
  nodesByType: stats.nodesByType,
  totalEdges: stats.totalEdges,
  averageConnections: stats.averageConnections,
  graphDensity: stats.graphDensity,
});
```

### Debug Info

Get debug information:

```typescript
const debugInfo = service.getDebugInfo();
console.log({
  isBuilt: debugInfo.isBuilt,
  lastUpdate: debugInfo.lastUpdate,
  graphStats: debugInfo.graphStats,
});
```

### Visualization

Get all nodes for visualization:

```typescript
const allNodes = service.getAllNodes();
// Render nodes on screen for debugging
```

## Error Handling

The pathfinding system handles various error conditions:

- **No path found**: Returns `success: false` in PathResult
- **Invalid positions**: Finds closest valid positions
- **Character stuck**: Triggers stuck callback for replanning
- **Terrain changes**: Automatically rebuilds graph when needed

## Integration with Existing Systems

The pathfinding system integrates with:

- **Character movement system**: Uses existing physics and controls
- **Collision detection**: Works with terrain collision masks
- **Ladder system**: Supports ladder climbing mechanics
- **AI controllers**: Provides high-level navigation interface

## Future Enhancements

Potential improvements:

- **Dynamic obstacles**: Handle moving characters and spells
- **Path smoothing**: Optimize paths for more natural movement
- **Hierarchical pathfinding**: Support for very large maps
- **Behavior trees**: Integration with AI behavior systems
- **Formation movement**: Support for group navigation

## Files

- `types.ts` - Type definitions and interfaces
- `terrainGraph.ts` - Terrain analysis and graph building
- `aStar.ts` - A\* pathfinding algorithm implementation
- `pathfindingService.ts` - High-level pathfinding interface
- `pathExecutor.ts` - Path execution and controller input generation
- `index.ts` - Main exports and utility functions
- `example.ts` - Usage examples and AI navigation class
- `README.md` - This documentation file
