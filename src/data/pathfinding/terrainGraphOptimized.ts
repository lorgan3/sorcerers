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

export class TerrainGraphOptimized {
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
    console.log("Building optimized terrain graph...");
    this.nodes.clear();

    // Step 1: Find all valid ground positions (optimized)
    this.findGroundNodesOptimized();

    // Step 2: Find ladder positions
    this.findLadderNodes();

    // Step 3: Connect nodes with movement edges (optimized)
    this.connectNodesOptimized();

    console.log(`Optimized graph built with ${this.nodes.size} nodes`);
  }

  /**
   * Find ground nodes with better spacing and strategic placement
   */
  private findGroundNodesOptimized(): void {
    const characterMask = rectangle6x16;
    const sampleInterval = 4; // Larger interval for better performance

    for (let x = 0; x < this.width - characterMask.width; x += sampleInterval) {
      for (
        let y = 0;
        y < this.height - characterMask.height;
        y += sampleInterval
      ) {
        // Check if character can fit at this position
        if (this.terrain.collidesWith(characterMask, x, y)) {
          continue;
        }

        // Check if there's ground directly below
        if (this.terrain.collidesWith(characterMask, x, y + 1)) {
          this.addNode(x, y, "ground");
        }
      }
    }

    // Add strategic nodes at platform edges and gaps
    this.addStrategicNodes();
  }

  /**
   * Add strategic nodes at important positions
   */
  private addStrategicNodes(): void {
    const characterMask = rectangle6x16;
    const checkInterval = 8; // Check every 8 pixels for strategic positions

    for (let x = 0; x < this.width - characterMask.width; x += checkInterval) {
      for (
        let y = 0;
        y < this.height - characterMask.height;
        y += checkInterval
      ) {
        if (this.terrain.collidesWith(characterMask, x, y)) {
          continue;
        }

        if (!this.terrain.collidesWith(characterMask, x, y + 1)) {
          continue;
        }

        // Check if this is a platform edge or near a gap
        const isNearGap = this.isNearHorizontalGap(x, y);
        const isHeightTransition = this.isNearHeightTransition(x, y);

        if (isNearGap || isHeightTransition) {
          if (!this.getNode(x, y)) {
            this.addNode(x, y, "ground");
          }
        }
      }
    }
  }

  /**
   * Check if position is near a horizontal gap
   */
  private isNearHorizontalGap(x: number, y: number): boolean {
    const characterMask = rectangle6x16;

    // Check left and right for gaps
    for (const direction of [-1, 1]) {
      let foundGap = false;
      for (let distance = 1; distance <= 6; distance++) {
        const checkX = x + direction * distance;
        if (checkX < 0 || checkX >= this.width - characterMask.width) break;

        // If there's no ground here, it's a gap
        if (!this.terrain.collidesWith(characterMask, checkX, y + 1)) {
          foundGap = true;
        } else if (foundGap) {
          // Found ground after a gap - this is a gap edge
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if position is near a height transition
   */
  private isNearHeightTransition(x: number, y: number): boolean {
    const characterMask = rectangle6x16;

    // Check for height changes nearby
    for (let checkY = y - 8; checkY <= y + 8; checkY += 4) {
      if (checkY < 0 || checkY >= this.height - characterMask.height) continue;

      const currentHasGround = this.terrain.collidesWith(
        characterMask,
        x,
        checkY + 1
      );
      const referenceHasGround = this.terrain.collidesWith(
        characterMask,
        x,
        y + 1
      );

      if (currentHasGround !== referenceHasGround) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find ladder nodes
   */
  private findLadderNodes(): void {
    const characterMask = rectangle6x16;

    for (const ladder of this.ladders) {
      // Sample ladder positions at regular intervals
      for (
        let x = ladder.left;
        x <= ladder.right - characterMask.width;
        x += 4
      ) {
        for (
          let y = ladder.top;
          y <= ladder.bottom - characterMask.height;
          y += 4
        ) {
          if (!this.terrain.collidesWith(characterMask, x, y)) {
            this.addNode(x, y, "ladder");
          }
        }
      }
    }
  }

  /**
   * Connect nodes with optimized logic
   */
  private connectNodesOptimized(): void {
    for (const node of this.nodes.values()) {
      this.addWalkingConnectionsOptimized(node);
      this.addJumpingConnectionsOptimized(node);
      this.addClimbingConnections(node);
      this.addFallingConnections(node);
    }
  }

  /**
   * Add optimized walking connections
   */
  private addWalkingConnectionsOptimized(node: PathNode): void {
    if (node.type !== "ground") return;

    // Check left and right walking with limited range
    for (const direction of [-1, 1]) {
      let lastConnectedDistance = 0;

      for (let distance = 4; distance <= 20; distance += 4) {
        // Skip small distances, use larger steps
        const targetX = node.x + direction * distance;
        const targetNode = this.getNode(targetX, node.y);

        if (targetNode && targetNode.type === "ground") {
          // Only add connection if it's significantly further than the last one
          if (distance - lastConnectedDistance >= 8) {
            if (this.isWalkPathClear(node.x, node.y, targetX, node.y)) {
              const cost = distance * this.options.walkSpeed;
              const keys = direction > 0 ? [Key.Right] : [Key.Left];
              this.addEdge(node, targetNode, "walk", cost, keys, distance * 20);
              lastConnectedDistance = distance;
            }
          }
        }
      }
    }
  }

  /**
   * Add optimized jumping connections - only essential jumps
   */
  private addJumpingConnectionsOptimized(node: PathNode): void {
    if (node.type !== "ground") return;

    // Only add jumps for significant gaps and height differences
    this.addEssentialJumps(node);
    this.addGapJumps(node);
  }

  /**
   * Add only essential vertical jumps
   */
  private addEssentialJumps(node: PathNode): void {
    const maxJumpHeight = this.options.jumpHeight;

    // Check for significant upward jumps only
    for (let dy = -maxJumpHeight; dy <= -4; dy += 4) {
      // Only significant heights
      for (let dx = -4; dx <= 4; dx += 4) {
        // Limited horizontal range
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
          // Only add if no walking path exists
          if (!this.hasDirectWalkingPath(node, targetNode)) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const cost = this.options.jumpCost + distance;

            const keys = [Key.Up];
            if (dx > 0) keys.push(Key.Right);
            if (dx < 0) keys.push(Key.Left);

            this.addEdge(node, targetNode, "jump", cost, keys, 60);
          }
        }
      }
    }
  }

  /**
   * Add gap jumping connections
   */
  private addGapJumps(node: PathNode): void {
    if (node.type !== "ground") return;

    // Check for horizontal gaps that need jumping
    for (const direction of [-1, 1]) {
      for (let gapSize = 4; gapSize <= 12; gapSize += 4) {
        // Only significant gaps
        const targetX = node.x + direction * gapSize;

        // Look for landing spots at same height or slightly different
        for (let heightOffset = -2; heightOffset <= 2; heightOffset += 2) {
          const targetY = node.y + heightOffset;
          const targetNode = this.getNode(targetX, targetY);

          if (targetNode && targetNode.type === "ground") {
            // Verify this is actually a gap
            if (this.isActualGap(node.x, node.y, targetX, targetY)) {
              if (this.isJumpPossible(node.x, node.y, targetX, targetY)) {
                const distance = Math.sqrt(
                  gapSize * gapSize + heightOffset * heightOffset
                );
                const cost = this.options.jumpCost + distance * 2; // Higher cost for gap jumps

                const keys = [Key.Up];
                if (direction > 0) keys.push(Key.Right);
                if (direction < 0) keys.push(Key.Left);

                this.addEdge(node, targetNode, "jump", cost, keys, 60);
                break; // Only one connection per gap
              }
            }
          }
        }
      }
    }
  }

  /**
   * Check if there's an actual gap between two points
   */
  private isActualGap(x1: number, y1: number, x2: number, y2: number): boolean {
    const characterMask = rectangle6x16;
    const direction = x2 > x1 ? 1 : -1;

    // Check if there's missing ground in between
    for (let x = x1 + direction * 2; x !== x2; x += direction * 2) {
      if (!this.terrain.collidesWith(characterMask, x, y1 + 1)) {
        return true; // Found a gap
      }
    }
    return false;
  }

  /**
   * Check if there's a direct walking path between two nodes
   */
  private hasDirectWalkingPath(from: PathNode, to: PathNode): boolean {
    // Simple check - if they're at the same height and path is clear
    if (Math.abs(from.y - to.y) <= 2) {
      return this.isWalkPathClear(from.x, from.y, to.x, to.y);
    }
    return false;
  }

  /**
   * Check if walking path is clear (simplified)
   */
  private isWalkPathClear(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const characterMask = rectangle6x16;
    const steps = Math.abs(x2 - x1) / 2; // Check every 2 pixels
    const dx = x2 > x1 ? 2 : -2;

    for (let i = 0; i <= steps; i++) {
      const x = x1 + i * dx;

      // Check if character collides with terrain
      if (this.terrain.collidesWith(characterMask, x, y1)) {
        return false;
      }

      // Check if there's ground below
      if (!this.terrain.collidesWith(characterMask, x, y1 + 1)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add climbing connections
   */
  private addClimbingConnections(node: PathNode): void {
    if (node.type !== "ladder") return;

    // Check up and down on ladder
    for (const direction of [-1, 1]) {
      for (let distance = 4; distance <= 16; distance += 4) {
        // Larger steps
        const targetY = node.y + direction * distance;
        const targetNode = this.getNode(node.x, targetY);

        if (targetNode && targetNode.type === "ladder") {
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
      const targetX = node.x + direction * 4; // Check a bit further
      const groundNode = this.getNode(targetX, node.y);

      if (groundNode && groundNode.type === "ground") {
        const cost = this.options.climbCost;
        const keys = direction > 0 ? [Key.Right] : [Key.Left];
        this.addEdge(node, groundNode, "walk", cost, keys, 20);
      }
    }
  }

  /**
   * Add falling connections
   */
  private addFallingConnections(node: PathNode): void {
    if (node.type === "ground") return;

    // Check falling straight down
    for (let distance = 4; distance <= 24; distance += 4) {
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
   * Simplified jump possibility check
   */
  private isJumpPossible(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Basic distance check
    if (distance > this.options.jumpDistance) {
      return false;
    }

    // Basic height check
    if (-dy > this.options.jumpHeight) {
      return false;
    }

    // Simplified collision check - just check a few points
    const characterMask = rectangle6x16;
    const midX = Math.round((x1 + x2) / 2);
    const midY = Math.round((y1 + y2) / 2) - 4; // Check slightly above

    return !this.terrain.collidesWith(characterMask, midX, midY);
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

  // Rest of the methods remain the same...
  private addNode(x: number, y: number, type: PathNode["type"]): PathNode {
    const id = `${x},${y}`;
    const node: PathNode = { x, y, type, connections: [], id };
    this.nodes.set(id, node);
    return node;
  }

  private getNode(x: number, y: number): PathNode | undefined {
    return this.nodes.get(`${x},${y}`);
  }

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

  public getNodes(): PathNode[] {
    return Array.from(this.nodes.values());
  }

  public isWalkable(x: number, y: number): boolean {
    const characterMask = rectangle6x16;

    if (this.terrain.collidesWith(characterMask, x, y)) {
      return false;
    }

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

  public updateGraph(): void {
    this.buildGraph();
  }

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

    return { nodeCount: this.nodes.size, edgeCount, nodesByType };
  }
}
