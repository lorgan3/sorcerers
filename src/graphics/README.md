# Pathfinding Debug Visualization

The pathfinding debug visualization provides a visual overlay showing the terrain graph used by AI bots for navigation.

## Usage

### Toggle Visualization

Press **F3** to toggle the pathfinding debug visualization on/off.

### Programmatic Control

```typescript
import { Level } from "../data/map/level";

// Toggle visibility
Level.instance.togglePathfindingDebug();

// Set visibility explicitly
Level.instance.setPathfindingDebugVisibility(true);

// Get debug information
const debugInfo = Level.instance.getPathfindingDebugInfo();
console.log(debugInfo);
```

## Visual Legend

### Nodes (Circles)

- **Green circles**: Ground nodes - positions where characters can stand on solid terrain
- **Yellow circles**: Ladder nodes - positions on ladders where characters can climb
- **Cyan circles**: Air nodes - positions in mid-air (rare, used for special cases)

### Edges (Lines with Arrows)

- **Green lines**: Walking connections - horizontal movement on solid ground
- **Orange lines**: Jumping connections - movement requiring jumps (vertical/horizontal)
- **Yellow lines**: Climbing connections - vertical movement on ladders
- **Light blue lines**: Falling connections - gravity-based downward movement

### Arrow Heads

- Show the direction of movement for each connection
- Point from source node to target node

## Features

- **Real-time Updates**: Visualization updates every 2 seconds when visible
- **Performance Optimized**: Only renders when visible, minimal impact on game performance
- **Comprehensive Coverage**: Shows all possible movement paths AI bots can take
- **Color Coded**: Easy to distinguish between different movement types

## Debug Information

The debug layer provides statistics about the pathfinding graph:

```typescript
const debugInfo = Level.instance.getPathfindingDebugInfo();
// Returns:
// {
//   visible: boolean,     // Whether visualization is currently shown
//   nodeCount: number,    // Total number of navigation nodes
//   edgeCount: number     // Total number of movement connections
// }
```

## Use Cases

### AI Development

- Verify that AI bots can reach all intended areas
- Identify areas where pathfinding might fail
- Optimize terrain design for better AI navigation

### Level Design

- Ensure all areas are accessible to AI characters
- Identify potential navigation bottlenecks
- Validate ladder and jump placements

### Debugging

- Troubleshoot AI navigation issues
- Verify pathfinding graph generation
- Analyze movement cost calculations

## Technical Details

- **Grid Scale**: Nodes are positioned on the game's grid system (6-pixel scale)
- **Movement Physics**: Connections respect character physics (jump height, gravity, etc.)
- **Collision Aware**: Only shows valid positions where characters can actually move
- **Dynamic**: Updates when terrain changes (e.g., from spell effects)

## Performance Notes

- Visualization has minimal performance impact when hidden
- Updates are throttled to every 2 seconds when visible
- Large maps may have thousands of nodes and connections
- Consider hiding visualization during intensive gameplay for optimal performance
