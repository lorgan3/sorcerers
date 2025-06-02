import { Character } from "../entity/character";
import { Key } from "../controller/controller";
import {
  PathNode,
  PathResult,
  MovementCommand,
  PHYSICS_CONSTANTS,
} from "./types";

interface ExecutionState {
  currentCommandIndex: number;
  commandStartTime: number;
  isExecuting: boolean;
  waitingForCondition: boolean;
  lastPosition: { x: number; y: number };
  stuckCounter: number;
  maxStuckTime: number;
}

export class PathExecutor {
  private character: Character;
  private currentPath: PathNode[] = [];
  private commands: MovementCommand[] = [];
  private state: ExecutionState;
  private onComplete?: (success: boolean) => void;
  private onStuck?: () => void;

  constructor(character: Character) {
    this.character = character;
    this.state = {
      currentCommandIndex: 0,
      commandStartTime: 0,
      isExecuting: false,
      waitingForCondition: false,
      lastPosition: { x: 0, y: 0 },
      stuckCounter: 0,
      maxStuckTime: 180, // 3 seconds at 60fps
    };
  }

  /**
   * Start executing a path
   */
  public executePath(
    pathResult: PathResult,
    onComplete?: (success: boolean) => void,
    onStuck?: () => void
  ): void {
    if (!pathResult.success || pathResult.path.length === 0) {
      console.warn("Cannot execute invalid path");
      onComplete?.(false);
      return;
    }

    this.currentPath = pathResult.path;
    this.commands = this.generateDetailedCommands(pathResult);
    this.onComplete = onComplete;
    this.onStuck = onStuck;

    this.state = {
      currentCommandIndex: 0,
      commandStartTime: Date.now(),
      isExecuting: true,
      waitingForCondition: false,
      lastPosition: this.getCharacterPosition(),
      stuckCounter: 0,
      maxStuckTime: 180,
    };

    console.log(
      `Starting path execution with ${this.commands.length} commands`
    );
  }

  /**
   * Update the path execution (call every frame)
   */
  public update(deltaTime: number): void {
    if (!this.state.isExecuting) {
      return;
    }

    // Check if we're stuck
    this.checkIfStuck();

    // Check if current command is complete
    if (this.isCurrentCommandComplete()) {
      this.advanceToNextCommand();
    }

    // Execute current command
    this.executeCurrentCommand();
  }

  /**
   * Stop path execution
   */
  public stop(): void {
    this.state.isExecuting = false;
    this.currentPath = [];
    this.commands = [];

    // Release all keys
    this.releaseAllKeys();
  }

  /**
   * Check if path execution is active
   */
  public isExecuting(): boolean {
    return this.state.isExecuting;
  }

  /**
   * Get current execution progress (0-1)
   */
  public getProgress(): number {
    if (this.commands.length === 0) {
      return 1;
    }
    return this.state.currentCommandIndex / this.commands.length;
  }

  /**
   * Generate detailed movement commands from path result
   */
  private generateDetailedCommands(pathResult: PathResult): MovementCommand[] {
    const commands: MovementCommand[] = [];

    for (let i = 0; i < pathResult.path.length - 1; i++) {
      const currentNode = pathResult.path[i];
      const nextNode = pathResult.path[i + 1];

      // Find the edge connecting these nodes
      const edge = currentNode.connections.find(
        (conn) => conn.target === nextNode
      );

      if (!edge) {
        console.warn("No edge found between path nodes", currentNode, nextNode);
        continue;
      }

      const command = this.createCommandFromEdge(currentNode, nextNode, edge);
      commands.push(command);

      // Add wait commands for complex movements
      if (edge.movementType === "jump") {
        commands.push({
          keys: [],
          duration: 30, // Wait for jump to complete
          waitForCondition: (char: Character) => char.body.grounded,
        });
      } else if (edge.movementType === "fall") {
        commands.push({
          keys: [],
          duration: 20,
          waitForCondition: (char: Character) => char.body.grounded,
        });
      }
    }

    return commands;
  }

  /**
   * Create a movement command from a path edge
   */
  private createCommandFromEdge(
    from: PathNode,
    to: PathNode,
    edge: any
  ): MovementCommand {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let keys: Key[] = [];
    let duration = edge.duration || 30;
    let waitForCondition: ((char: Character) => boolean) | undefined;

    switch (edge.movementType) {
      case "walk":
        keys = dx > 0 ? [Key.Right] : dx < 0 ? [Key.Left] : [];
        duration = Math.abs(dx) * 20; // Approximate walking time
        break;

      case "jump":
        keys = [Key.Up];
        if (dx > 0) keys.push(Key.Right);
        if (dx < 0) keys.push(Key.Left);
        duration = 15; // Initial jump input duration
        waitForCondition = (char: Character) => {
          const pos = this.getCharacterGridPosition(char);
          return Math.abs(pos.x - to.x) <= 2 && Math.abs(pos.y - to.y) <= 2;
        };
        break;

      case "climb":
        if (dy < 0) {
          keys = [Key.Up];
        } else if (dy > 0) {
          keys = [Key.Down];
        }
        duration = Math.abs(dy) * 15;
        waitForCondition = (char: Character) => char.body.onLadder;
        break;

      case "fall":
        keys = []; // No input needed for falling
        duration = 10;
        waitForCondition = (char: Character) => char.body.grounded;
        break;
    }

    return {
      keys,
      duration,
      waitForCondition,
    };
  }

  /**
   * Check if the current command is complete
   */
  private isCurrentCommandComplete(): boolean {
    if (this.state.currentCommandIndex >= this.commands.length) {
      return true;
    }

    const command = this.commands[this.state.currentCommandIndex];
    const elapsed = Date.now() - this.state.commandStartTime;

    // Check duration
    if (elapsed >= command.duration) {
      return true;
    }

    // Check wait condition
    if (command.waitForCondition && this.state.waitingForCondition) {
      return command.waitForCondition(this.character);
    }

    return false;
  }

  /**
   * Advance to the next command
   */
  private advanceToNextCommand(): void {
    this.releaseAllKeys();
    this.state.currentCommandIndex++;
    this.state.commandStartTime = Date.now();
    this.state.waitingForCondition = false;

    if (this.state.currentCommandIndex >= this.commands.length) {
      // Path execution complete
      this.state.isExecuting = false;
      console.log("Path execution completed successfully");
      this.onComplete?.(true);
    }
  }

  /**
   * Execute the current command
   */
  private executeCurrentCommand(): void {
    if (this.state.currentCommandIndex >= this.commands.length) {
      return;
    }

    const command = this.commands[this.state.currentCommandIndex];

    // Press required keys
    for (const key of command.keys) {
      this.pressKey(key);
    }

    // Check if we should start waiting for condition
    if (command.waitForCondition && !this.state.waitingForCondition) {
      const elapsed = Date.now() - this.state.commandStartTime;
      if (elapsed >= command.duration * 0.5) {
        // Start checking condition halfway through
        this.state.waitingForCondition = true;
      }
    }
  }

  /**
   * Check if the character is stuck
   */
  private checkIfStuck(): void {
    const currentPos = this.getCharacterPosition();
    const lastPos = this.state.lastPosition;

    const distance = Math.sqrt(
      (currentPos.x - lastPos.x) ** 2 + (currentPos.y - lastPos.y) ** 2
    );

    if (distance < 1) {
      // Character hasn't moved much
      this.state.stuckCounter++;
    } else {
      this.state.stuckCounter = 0;
      this.state.lastPosition = currentPos;
    }

    if (this.state.stuckCounter >= this.state.maxStuckTime) {
      console.warn("Character appears to be stuck, stopping path execution");
      this.state.isExecuting = false;
      this.releaseAllKeys();
      this.onStuck?.();
      this.onComplete?.(false);
    }
  }

  /**
   * Get character position in world coordinates
   */
  private getCharacterPosition(): { x: number; y: number } {
    const [x, y] = this.character.getCenter();
    return { x, y };
  }

  /**
   * Get character position in grid coordinates
   */
  private getCharacterGridPosition(char: Character): { x: number; y: number } {
    const [x, y] = char.body.position;
    return { x, y };
  }

  /**
   * Press a key on the character's controller
   */
  private pressKey(key: Key): void {
    if (this.character.player.controller) {
      this.character.player.controller.setKey(key, true);
    }
  }

  /**
   * Release a key on the character's controller
   */
  private releaseKey(key: Key): void {
    if (this.character.player.controller) {
      this.character.player.controller.setKey(key, false);
    }
  }

  /**
   * Release all keys
   */
  private releaseAllKeys(): void {
    const allKeys = [
      Key.Up,
      Key.Down,
      Key.Left,
      Key.Right,
      Key.W,
      Key.A,
      Key.S,
      Key.D,
    ];
    for (const key of allKeys) {
      this.releaseKey(key);
    }
  }

  /**
   * Get current command being executed
   */
  public getCurrentCommand(): MovementCommand | null {
    if (this.state.currentCommandIndex >= this.commands.length) {
      return null;
    }
    return this.commands[this.state.currentCommandIndex];
  }

  /**
   * Get remaining commands
   */
  public getRemainingCommands(): MovementCommand[] {
    return this.commands.slice(this.state.currentCommandIndex);
  }

  /**
   * Skip to a specific command index
   */
  public skipToCommand(index: number): void {
    if (index >= 0 && index < this.commands.length) {
      this.releaseAllKeys();
      this.state.currentCommandIndex = index;
      this.state.commandStartTime = Date.now();
      this.state.waitingForCondition = false;
    }
  }

  /**
   * Pause execution
   */
  public pause(): void {
    if (this.state.isExecuting) {
      this.releaseAllKeys();
      this.state.isExecuting = false;
    }
  }

  /**
   * Resume execution
   */
  public resume(): void {
    if (!this.state.isExecuting && this.commands.length > 0) {
      this.state.isExecuting = true;
      this.state.commandStartTime = Date.now();
    }
  }

  /**
   * Get execution debug info
   */
  public getDebugInfo(): {
    isExecuting: boolean;
    currentCommand: number;
    totalCommands: number;
    progress: number;
    stuckCounter: number;
    currentKeys: Key[];
  } {
    const currentCommand = this.getCurrentCommand();

    return {
      isExecuting: this.state.isExecuting,
      currentCommand: this.state.currentCommandIndex,
      totalCommands: this.commands.length,
      progress: this.getProgress(),
      stuckCounter: this.state.stuckCounter,
      currentKeys: currentCommand?.keys || [],
    };
  }
}
