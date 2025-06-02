import { Level } from "../map/level";
import { CollisionMask } from "../collision/collisionMask";
import { Key } from "../controller/controller";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { BBox } from "../map/bbox";
import {
  PathNode,
  PathEdge,
  Point,
  TerrainGraphOptions,
  PHYSICS_CONSTANTS,
} from "./types";

export class TerrainGraph {
  private nodes: Map<string, PathNode> = new Map();
  private terrain: CollisionMask;
  private ladders: BBox[];
  private width: number;
  private height: number;
  private options: Required<TerrainGraphOptions>;

  constructor(options: TerrainGraphOptions = {}) {
    this.options = {
      jumpHeight: options.jumpHeight ?? PHYSICS_CONSTANTS.MAX_JUMP_HEIGHT,
      jumpDistance: options.jumpDistance ?? PHYSICS_CONSTANTS.MAX_JUMP_DISTANCE,
      walkSpeed: options.walkSpeed ?? PHYSICS_CONSTANTS.SPEED,
      jumpCost: options.jumpCost ?? 10,
      climbCost: options.climbCost ?? 5,
      fallCost: options.fallCost ?? 1,
    };

    this.terrain = Level.instance.terrain.collisionMask;
    this.ladders = Level.instance.terrain.ladders;
    this.width = Level.instance.terrain.width;
    this.height = Level.instance.terrain.height;
  }

  /**
   * Build the complete navigation graph from the terrain
   */
  public buildGraph(): void {
    console.log("Building terrain graph...");
    this.nodes.clear();

    // Step 1: Find all valid ground positions
    this.findGroundNodes();

    // Step 2: Find ladder positions
    this.findLadderNodes();

    // Step 3: Connect nodes with movement edges
    this.connectNodes();

    console.log(`Graph built with ${this.nodes.size} nodes`);
  }

  /**
   * Find all positions where a character can stand on solid ground
   */
  private findGroundNodes(): void {
    const characterMask = rectangle6x16;

    // Sample at regular intervals for better coverage
    const sampleInterval = 2; // Check every 2 pixels for better coverage

    for (let x = 0; x < this.width - characterMask.width; x += sampleInterval) {
      for (
        let y = 0;
        y < this.height - characterMask.height;
        y += sampleInterval
      ) {
        // Check if character can fit at this position (not colliding with terrain)
        if (this.terrain.collidesWith(characterMask, x, y)) {
          continue;
        }

        // Check if there's ground directly below (character is standing on something)
        if (this.terrain.collidesWith(characterMask, x, y + 1)) {
          this.addNode(x, y, "ground");
        }
      }
    }

    // Add additional nodes at platform edges and corners
    this.addPlatformEdgeNodes();
  }

  /**
   * Add nodes at platform edges and important positions
   */
  private addPlatformEdgeNodes(): void {
    const characterMask = rectangle6x16;

    for (let x = 0; x < this.width - characterMask.width; x++) {
      for (let y = 0; y < this.height - characterMask.height; y++) {
        // Skip if character can't fit here
        if (this.terrain.collidesWith(characterMask, x, y)) {
          continue;
        }

        // Check if there's ground below
        if (!this.terrain.collidesWith(characterMask, x, y + 1)) {
          continue;
        }

        // Check if this is a platform edge (important for jumping)
        const isLeftEdge =
          x === 0 || !this.terrain.collidesWith(characterMask, x - 1, y + 1);
        const isRightEdge =
          x >= this.width - characterMask.width - 1 ||
          !this.terrain.collidesWith(characterMask, x + 1, y + 1);

        // Check if this is near a height change
        let isHeightChange = false;
        for (let checkY = y - 5; checkY <= y + 5; checkY++) {
          if (checkY >= 0 && checkY < this.height - characterMask.height) {
            if (
              this.terrain.collidesWith(characterMask, x, checkY) !==
              this.terrain.collidesWith(characterMask, x, y)
            ) {
              isHeightChange = true;
              break;
            }
          }
        }

        // Add node if it's at an important position
        if (isLeftEdge || isRightEdge || isHeightChange) {
          if (!this.getNode(x, y)) {
            // Don't duplicate existing nodes
            this.addNode(x, y, "ground");
          }
        }
      }
    }
  }

  /**
   * Find all positions on ladders where a character can be
   */
  private findLadderNodes(): void {
    const characterMask = rectangle6x16;

    for (const ladder of this.ladders) {
      // Sample ladder positions at regular intervals
      for (let x = ladder.left; x <= ladder.right - characterMask.width; x++) {
        for (
          let y = ladder.top;
          y <= ladder.bottom - characterMask.height;
          y += 2
        ) {
          // Check if character can fit at this ladder position
          if (!this.terrain.collidesWith(characterMask, x, y)) {
            this.addNode(x, y, "ladder");
          }
        }
      }
    }
  }

  /**
   * Connect all nodes with valid movement edges
   */
  private connectNodes(): void {
    for (const node of this.nodes.values()) {
      this.addWalkingConnections(node);
      this.addJumpingConnections(node);
      this.addClimbingConnections(node);
      this.addFallingConnections(node);
    }
  }

  /**
   * Add walking connections (horizontal movement on ground)
   */
  private addWalkingConnections(node: PathNode): void {
    if (node.type !== "ground") return;

    // Check left and right walking
    for (const direction of [-1, 1]) {
      for (let distance = 1; distance <= 10; distance++) {
        const targetX = node.x + direction * distance;
        const targetNode = this.getNode(targetX, node.y);

        if (targetNode && targetNode.type === "ground") {
          // Check if path is clear for walking (allow small gaps)
          if (this.isWalkPathClearWithGaps(node.x, node.y, targetX, node.y)) {
            const cost = distance * this.options.walkSpeed;
            const keys = direction > 0 ? [Key.Right] : [Key.Left];

            this.addEdge(node, targetNode, "walk", cost, keys, distance * 20);
          }
        } else {
          // Check if we can reach a node at a slightly different height
          for (let heightOffset = -2; heightOffset <= 2; heightOffset++) {
            const targetY = node.y + heightOffset;
            const offsetNode = this.getNode(targetX, targetY);

            if (offsetNode && offsetNode.type === "ground") {
              // Small height differences can be handled by walking/stepping
              if (
                Math.abs(heightOffset) <= 3 &&
                this.isWalkPathClearWithGaps(node.x, node.y, targetX, targetY)
              ) {
                const cost =
                  distance * this.options.walkSpeed +
                  Math.abs(heightOffset) * 2;
                const keys = direction > 0 ? [Key.Right] : [Key.Left];

                this.addEdge(
                  node,
                  offsetNode,
                  "walk",
                  cost,
                  keys,
                  distance * 20
                );
                break; // Found a connection, stop checking other heights
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add jumping connections (vertical and horizontal jumps)
   */
  private addJumpingConnections(node: PathNode): void {
    if (node.type !== "ground") return;

    const maxJumpHeight = this.options.jumpHeight;
    const maxJumpDistance = this.options.jumpDistance;

    // Check various jump trajectories
    for (let dx = -maxJumpDistance; dx <= maxJumpDistance; dx++) {
      for (let dy = -maxJumpHeight; dy <= maxJumpHeight / 2; dy++) {
        if (dx === 0 && dy === 0) continue;

        const targetX = node.x + dx;
        const targetY = node.y + dy;

        if (
          targetX < 0 ||
          targetX >= this.width ||
          targetY < 0 ||
          targetY >= this.height
        ) {
          continue;
        }

        const targetNode = this.getNode(targetX, targetY);
        if (
          targetNode &&
          this.isJumpPossible(node.x, node.y, targetX, targetY)
        ) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const cost = this.options.jumpCost + distance;

          // Determine required keys for jump
          const keys = [Key.Up];
          if (dx > 0) keys.push(Key.Right);
          if (dx < 0) keys.push(Key.Left);

          this.addEdge(node, targetNode, "jump", cost, keys, 60);
        } else if (!targetNode) {
          // Check for nodes in a small area around the target position
          for (let offsetX = -2; offsetX <= 2; offsetX++) {
            for (let offsetY = -2; offsetY <= 2; offsetY++) {
              const nearX = targetX + offsetX;
              const nearY = targetY + offsetY;

              if (
                nearX >= 0 &&
                nearX < this.width &&
                nearY >= 0 &&
                nearY < this.height
              ) {
                const nearNode = this.getNode(nearX, nearY);
                if (
                  nearNode &&
                  this.isJumpPossible(node.x, node.y, nearX, nearY)
                ) {
                  const distance = Math.sqrt(
                    (nearX - node.x) ** 2 + (nearY - node.y) ** 2
                  );
                  const cost = this.options.jumpCost + distance;

                  const keys = [Key.Up];
                  if (nearX > node.x) keys.push(Key.Right);
                  if (nearX < node.x) keys.push(Key.Left);

                  this.addEdge(node, nearNode, "jump", cost, keys, 60);
                }
              }
            }
          }
        }
      }
    }

    // Add specific horizontal gap jumping
    this.addHorizontalGapJumps(node);
  }

  /**
   * Add horizontal gap jumping connections
   */
  private addHorizontalGapJumps(node: PathNode): void {
    if (node.type !== "ground") return;

    // Check for horizontal gaps that can be jumped
    for (const direction of [-1, 1]) {
      for (let gapSize = 2; gapSize <= 8; gapSize++) {
        const targetX = node.x + direction * gapSize;

        // Look for landing spots at same height or slightly different
        for (let heightOffset = -3; heightOffset <= 3; heightOffset++) {
          const targetY = node.y + heightOffset;
          const targetNode = this.getNode(targetX, targetY);

          if (targetNode && targetNode.type === "ground") {
            // Check if this is actually a gap (no ground in between)
            let isGap = true;
            for (
              let checkX = node.x + direction;
              checkX !== targetX;
              checkX += direction
            ) {
              if (this.getNode(checkX, node.y)) {
                isGap = false;
                break;
              }
            }

            if (
              isGap &&
              this.isJumpPossible(node.x, node.y, targetX, targetY)
            ) {
              const distance = Math.sqrt(
                gapSize * gapSize + heightOffset * heightOffset
              );
              const cost = this.options.jumpCost + distance * 1.5; // Higher cost for gap jumps

              const keys = [Key.Up];
              if (direction > 0) keys.push(Key.Right);
              if (direction < 0) keys.push(Key.Left);

              this.addEdge(node, targetNode, "jump", cost, keys, 60);
              break; // Found a connection, stop checking other heights
            }
          }
        }
      }
    }
  }

  /**
   * Add climbing connections (vertical movement on ladders)
   */
  private addClimbingConnections(node: PathNode): void {
    if (node.type !== "ladder") return;

    // Check up and down on ladder
    for (const direction of [-1, 1]) {
      for (let distance = 1; distance <= 10; distance++) {
        const targetY = node.y + direction * distance;
        const targetNode = this.getNode(node.x, targetY);

        if (targetNode && targetNode.type === "ladder") {
          // Check if we're still on the same ladder
          if (this.isOnSameLadder(node.x, node.y, node.x, targetY)) {
            const cost = distance * this.options.climbCost;
            const keys = direction > 0 ? [Key.Down] : [Key.Up];

            this.addEdge(node, targetNode, "climb", cost, keys, distance * 15);
          }
        } else {
          break;
        }
      }
    }

    // Connect ladder to adjacent ground nodes
    for (const direction of [-1, 1]) {
      const targetX = node.x + direction;
      const groundNode = this.getNode(targetX, node.y);

      if (groundNode && groundNode.type === "ground") {
        const cost = this.options.climbCost;
        const keys = direction > 0 ? [Key.Right] : [Key.Left];

        this.addEdge(node, groundNode, "walk", cost, keys, 20);
      }
    }
  }

  /**
   * Add falling connections (gravity-based movement)
   */
  private addFallingConnections(node: PathNode): void {
    if (node.type === "ground") return; // Already on ground

    // Check falling straight down
    for (let distance = 1; distance <= 20; distance++) {
      const targetY = node.y + distance;
      const targetNode = this.getNode(node.x, targetY);

      if (targetNode && targetNode.type === "ground") {
        const cost = distance * this.options.fallCost;
        this.addEdge(node, targetNode, "fall", cost, [], distance * 5);
        break;
      }
    }
  }

  /**
   * Check if walking path between two points is clear
   */
  private isWalkPathClear(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const characterMask = rectangle6x16;
    const steps = Math.abs(x2 - x1);
    const dx = x2 > x1 ? 1 : -1;

    for (let i = 0; i <= steps; i++) {
      const x = x1 + i * dx;

      // Check if character collides with terrain at this position
      if (this.terrain.collidesWith(characterMask, x, y1)) {
        return false;
      }

      // Check if there's still ground below
      if (!this.terrain.collidesWith(characterMask, x, y1 + 1)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if walking path between two points is clear, allowing small gaps
   */
  private isWalkPathClearWithGaps(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const characterMask = rectangle6x16;
    const steps = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    const dx = x2 > x1 ? 1 : x1 > x2 ? -1 : 0;
    const dy = y2 > y1 ? 1 : y1 > y2 ? -1 : 0;

    let gapCount = 0;
    const maxGapSize = 3; // Allow gaps up to 3 units wide
    let currentGapSize = 0;

    for (let i = 0; i <= steps; i++) {
      const x = x1 + Math.round((i / steps) * (x2 - x1));
      const y = y1 + Math.round((i / steps) * (y2 - y1));

      // Check if character collides with terrain at this position
      if (this.terrain.collidesWith(characterMask, x, y)) {
        return false; // Path blocked by terrain
      }

      // Check if there's ground below
      const hasGroundBelow = this.terrain.collidesWith(characterMask, x, y + 1);

      if (!hasGroundBelow) {
        currentGapSize++;
        if (currentGapSize > maxGapSize) {
          return false; // Gap too large
        }
      } else {
        if (currentGapSize > 0) {
          gapCount++;
          currentGapSize = 0;
        }
      }
    }

    // Allow a reasonable number of small gaps
    return gapCount <= 2;
  }

  /**
   * Check if a jump from one point to another is physically possible
   */
  private isJumpPossible(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Don't allow jumps that are too far
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > this.options.jumpDistance * 1.5) {
      return false;
    }

    // Basic physics check - can we reach this point with our jump strength?
    const jumpStrength = PHYSICS_CONSTANTS.JUMP_STRENGTH;
    const gravity = PHYSICS_CONSTANTS.GRAVITY;
    const horizontalSpeed = PHYSICS_CONSTANTS.SPEED * 60; // Convert to pixels per second

    // Calculate time to reach horizontal distance
    const timeToReachX = Math.abs(dx) / horizontalSpeed;

    // Calculate maximum height we can reach at that time
    const maxHeightAtTime =
      jumpStrength * timeToReachX - 0.5 * gravity * timeToReachX * timeToReachX;

    // Check if we can reach the target height
    if (-dy > maxHeightAtTime) {
      return false; // Too high to reach
    }

    // For downward jumps, check if we don't fall too far
    if (dy > 0) {
      const fallTime = Math.sqrt((2 * dy) / gravity);
      const horizontalDistanceAtFall = horizontalSpeed * fallTime;
      if (Math.abs(dx) > horizontalDistanceAtFall) {
        return false; // Can't reach horizontally while falling
      }
    }

    // Check if path is clear with more detailed collision checking
    const characterMask = rectangle6x16;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 10); // At least 10 steps

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.round(x1 + dx * t);

      // More accurate trajectory calculation
      const jumpTime = timeToReachX * t;
      const trajectoryY =
        y1 - jumpStrength * jumpTime + 0.5 * gravity * jumpTime * jumpTime;
      const y = Math.round(trajectoryY);

      // Check collision with some tolerance
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        if (this.terrain.collidesWith(characterMask, x, y)) {
          return false; // Path blocked
        }
      }
    }

    return true;
  }

  /**
   * Check if two points are on the same ladder
   */
  private isOnSameLadder(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    for (const ladder of this.ladders) {
      if (
        x1 >= ladder.left &&
        x1 <= ladder.right &&
        y1 >= ladder.top &&
        y1 <= ladder.bottom &&
        x2 >= ladder.left &&
        x2 <= ladder.right &&
        y2 >= ladder.top &&
        y2 <= ladder.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a node to the graph
   */
  private addNode(x: number, y: number, type: PathNode["type"]): PathNode {
    const id = `${x},${y}`;
    const node: PathNode = {
      x,
      y,
      type,
      connections: [],
      id,
    };

    this.nodes.set(id, node);
    return node;
  }

  /**
   * Get a node at specific coordinates
   */
  private getNode(x: number, y: number): PathNode | undefined {
    return this.nodes.get(`${x},${y}`);
  }

  /**
   * Add an edge between two nodes
   */
  private addEdge(
    from: PathNode,
    to: PathNode,
    movementType: PathEdge["movementType"],
    cost: number,
    requiredInputs: Key[],
    duration: number = 30
  ): void {
    const edge: PathEdge = {
      target: to,
      movementType,
      cost,
      requiredInputs,
      duration,
    };

    from.connections.push(edge);
  }

  /**
   * Get the closest node to a given position
   */
  public getClosestNode(x: number, y: number): PathNode | null {
    let closestNode: PathNode | null = null;
    let closestDistance = Infinity;

    for (const node of this.nodes.values()) {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNode = node;
      }
    }

    return closestNode;
  }

  /**
   * Get all nodes in the graph
   */
  public getNodes(): PathNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Check if a position is walkable
   */
  public isWalkable(x: number, y: number): boolean {
    const characterMask = rectangle6x16;

    // Check if character can fit at this position
    if (this.terrain.collidesWith(characterMask, x, y)) {
      return false;
    }

    // Check if there's ground below or if we're on a ladder
    const hasGroundBelow = this.terrain.collidesWith(characterMask, x, y + 1);
    const onLadder = this.ladders.some(
      (ladder) =>
        x >= ladder.left &&
        x <= ladder.right &&
        y >= ladder.top &&
        y <= ladder.bottom
    );

    return hasGroundBelow || onLadder;
  }

  /**
   * Update the graph when terrain changes
   */
  public updateGraph(): void {
    this.buildGraph();
  }

  /**
   * Get debug information about the graph
   */
  public getDebugInfo(): {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
  } {
    const nodesByType: Record<string, number> = {};
    let edgeCount = 0;

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      edgeCount += node.connections.length;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      nodesByType,
    };
  }
}
