# Advanced Pathfinding Implementation Plan for Sorcerers Game

## Overview

Implement A\* pathfinding for AI bots to navigate the game terrain intelligently, considering all possible character movements including walking, jumping, and ladder climbing.

## Phase 1: Terrain Analysis and Graph Generation

### 1.1 Terrain Graph Builder (`src/data/pathfinding/terrainGraph.ts`)

- **Purpose**: Convert the game terrain into a navigable graph
- **Key Components**:
  - Analyze `Level.instance.terrain` to identify walkable surfaces
  - Detect jump-reachable positions (considering character jump physics)
  - Map ladder connections between different height levels
  - Account for character collision mask (6x16 rectangle from character.ts)
  - Generate nodes representing valid character positions
  - Create edges representing possible movements (walk, jump, climb)

### 1.2 Movement Analysis

- **Walking**: Horizontal movement on solid ground
- **Jumping**: Vertical and horizontal movement with physics constraints
- **Ladder Climbing**: Vertical movement on ladder tiles
- **Fall Detection**: Account for gravity and landing positions

### 1.3 Graph Node Structure

```typescript
interface PathNode {
  x: number; // Grid position
  y: number; // Grid position
  type: "ground" | "ladder" | "air";
  connections: PathEdge[];
}

interface PathEdge {
  target: PathNode;
  movementType: "walk" | "jump" | "climb" | "fall";
  cost: number; // Movement cost for A*
  requiredInputs: Key[]; // Keys needed to execute this movement
}
```

## Phase 2: A\* Pathfinding Implementation

### 2.1 A\* Algorithm (`src/data/pathfinding/aStar.ts`)

- **Purpose**: Find optimal path between two points using the terrain graph
- **Features**:
  - Heuristic function considering 2D distance and movement costs
  - Priority queue for efficient node exploration
  - Path reconstruction from goal to start
  - Handle unreachable targets gracefully

### 2.2 Pathfinding Service (`src/data/pathfinding/pathfindingService.ts`)

- **Purpose**: High-level interface for pathfinding operations
- **Methods**:
  - `findPath(start: Point, goal: Point): PathResult`
  - `updateGraph()`: Rebuild graph when terrain changes
  - `isReachable(start: Point, goal: Point): boolean`

## Phase 3: Path Execution and Keystroke Generation

### 3.1 Path Executor (`src/data/pathfinding/pathExecutor.ts`)

- **Purpose**: Convert pathfinding results into controller inputs
- **Features**:
  - Break down path into movement segments
  - Generate timing-aware keystroke sequences
  - Handle movement state transitions (ground → air → ladder)
  - Account for character physics and animation timing

### 3.2 Movement Commands

```typescript
interface MovementCommand {
  keys: Key[];
  duration: number;
  waitForCondition?: (character: Character) => boolean;
}
```

### 3.3 Command Sequences

- **Walk Commands**: Left/Right arrow keys with appropriate timing
- **Jump Commands**: Up key with directional input for horizontal jumps
- **Climb Commands**: Up/Down keys when on ladders
- **Wait Commands**: Pause execution for physics to settle

## Phase 4: AI Controller Integration

### 4.1 Enhanced AI Controller (`src/data/controller/aiController.ts`)

- **Purpose**: Integrate pathfinding with existing AI behavior
- **New Features**:
  - `navigateTo(target: Point): void`
  - `isNavigating(): boolean`
  - `cancelNavigation(): void`
  - Queue system for movement commands
  - Fallback behavior when pathfinding fails

### 4.2 AI Behavior States

- **Idle**: No active navigation
- **Pathfinding**: Calculating route to target
- **Executing**: Following calculated path
- **Stuck**: Unable to reach target, needs replanning

## Phase 5: Performance and Optimization

### 5.1 Graph Caching

- Cache terrain graph between frames
- Incremental updates when terrain changes
- Spatial partitioning for large maps

### 5.2 Path Smoothing

- Optimize paths to reduce unnecessary movements
- Combine sequential movements of same type
- Lookahead for more efficient jumping

### 5.3 Real-time Constraints

- Limit pathfinding computation time per frame
- Asynchronous pathfinding for complex routes
- Progressive path refinement

## Phase 6: Testing and Validation

### 6.1 Unit Tests

- Graph generation accuracy
- A\* algorithm correctness
- Movement command generation
- Edge case handling (unreachable targets, terrain changes)

### 6.2 Integration Tests

- End-to-end pathfinding scenarios
- Performance benchmarks
- AI behavior validation

### 6.3 Visual Debugging

- Debug overlay showing generated graph
- Path visualization
- Movement command timeline

## Implementation Order

1. **Terrain Graph Builder** - Foundation for all pathfinding
2. **A\* Algorithm** - Core pathfinding logic
3. **Path Executor** - Convert paths to actions
4. **AI Controller Integration** - Connect to existing systems
5. **Performance Optimization** - Ensure smooth gameplay
6. **Testing and Debugging** - Validate implementation

## Key Considerations

### Character Physics Integration

- Respect existing character movement constraints
- Account for jump grace time (3 frames from character.ts)
- Handle ladder mounting speed limits
- Consider character collision mask dimensions

### Terrain Interaction

- Work with existing collision system
- Handle dynamic terrain changes (spells that modify terrain)
- Account for killbox areas that damage characters

### Performance Requirements

- Pathfinding should not impact game framerate
- Graph updates should be efficient
- Memory usage should be reasonable for large maps

### AI Behavior Quality

- Paths should look natural and intelligent
- Handle dynamic obstacles (other characters, spells)
- Provide fallback behaviors for edge cases

## File Structure

```
src/data/pathfinding/
├── terrainGraph.ts      # Graph generation from terrain
├── aStar.ts            # A* pathfinding algorithm
├── pathfindingService.ts # High-level pathfinding interface
├── pathExecutor.ts     # Path to keystroke conversion
├── types.ts           # Shared type definitions
└── __spec__/          # Unit tests
    ├── terrainGraph.spec.ts
    ├── aStar.spec.ts
    └── pathExecutor.spec.ts
```

This plan provides a comprehensive approach to implementing advanced pathfinding that integrates seamlessly with the existing character movement system while providing intelligent navigation capabilities for AI bots.
