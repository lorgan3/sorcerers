import { Controller, Key, keyMap } from "./controller";
import { Manager } from "../network/manager";
import { Level } from "../map/level";
import { Character } from "../entity/character";
import { PathExecutor } from "../pathfinding/pathExecutor";
import { PathfindingService } from "../pathfinding/pathfindingService";

export class AiController implements Controller {
  public pressedKeys = 0;
  private pathExecutor: PathExecutor | null = null;
  private targetCharacter: Character | null = null;
  private lastPathfindingTime = 0;
  private pathfindingCooldown = 1000; // 1 second between pathfinding attempts
  private isInitialized = false;

  private eventHandlers = new Map<Key, Set<() => void>>();

  destroy() {
    this.pathExecutor?.stop();
    this.pathExecutor = null;
    this.targetCharacter = null;
  }

  isKeyDown(key?: Key) {
    if (!key) {
      return !!this.pressedKeys;
    }

    return !!(this.pressedKeys & keyMap[key]);
  }

  getMouse(): [number, number] {
    return [0, 0];
  }

  getLocalMouse(): [number, number] {
    return [0, 0];
  }

  resetKeys() {
    this.pressedKeys = 0;
  }

  setKey(key: Key, state: boolean) {
    if (state) {
      this.pressedKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());
    } else {
      this.pressedKeys &= ~keyMap[key];
    }
  }

  serialize(): [number, number, number] {
    return [0, 0, 0];
  }

  deserialize(buffer: [number, number, number]) {
    this.pressedKeys = buffer[0];
  }

  async tick(dt: number) {
    const activeCharacter = Manager.instance.getActiveCharacter();

    // Only act if this AI controller is controlling the active character
    if (!activeCharacter || activeCharacter.player.controller !== this) {
      return;
    }

    // Initialize pathfinding service if not done yet
    if (!this.isInitialized) {
      try {
        const pathfindingService = PathfindingService.getInstance();
        if (!pathfindingService.getDebugInfo().isBuilt) {
          await pathfindingService.initialize();
        }
        this.isInitialized = true;
        console.log("AI Controller: Pathfinding initialized");
      } catch (error) {
        console.warn("AI Controller: Failed to initialize pathfinding", error);
        return;
      }
    }

    // Initialize path executor for this character if needed
    if (!this.pathExecutor) {
      this.pathExecutor = new PathExecutor(activeCharacter);
    }

    // Update current path execution
    this.pathExecutor.update(dt);

    // Check if we need to find a new target or path
    const currentTime = Date.now();
    const shouldFindNewPath =
      !this.pathExecutor.isExecuting() &&
      currentTime - this.lastPathfindingTime > this.pathfindingCooldown;

    if (shouldFindNewPath) {
      this.findAndNavigateToTarget(activeCharacter);
      this.lastPathfindingTime = currentTime;
    }
  }

  private findAndNavigateToTarget(activeCharacter: Character): void {
    try {
      // Find the closest enemy character
      const targetCharacter = this.findClosestEnemyCharacter(activeCharacter);

      if (!targetCharacter) {
        console.log("AI Controller: No enemy characters found");
        return;
      }

      // Get positions
      const [myX, myY] = activeCharacter.body.position;
      const [targetX, targetY] = targetCharacter.body.position;

      const start = { x: myX, y: myY };
      const goal = { x: targetX, y: targetY };

      console.log(
        `AI Controller: Navigating from (${myX}, ${myY}) to (${targetX}, ${targetY})`
      );

      // Get pathfinding service and find path
      const pathfindingService = PathfindingService.getInstance();
      const pathResult = pathfindingService.findPath(start, goal);

      if (pathResult.success) {
        console.log(
          `AI Controller: Path found with ${pathResult.path.length} nodes`
        );

        // Execute the path
        this.pathExecutor?.executePath(
          pathResult,
          (success) => {
            if (success) {
              console.log("AI Controller: Reached target");
            } else {
              console.log("AI Controller: Failed to reach target");
            }
            this.targetCharacter = null;
          },
          () => {
            console.log("AI Controller: Got stuck, will retry pathfinding");
            this.targetCharacter = null;
          }
        );

        this.targetCharacter = targetCharacter;
      } else {
        console.log("AI Controller: No path found to target");
      }
    } catch (error) {
      console.warn("AI Controller: Error during pathfinding", error);
    }
  }

  private findClosestEnemyCharacter(
    activeCharacter: Character
  ): Character | null {
    const myPlayer = activeCharacter.player;
    const [myX, myY] = activeCharacter.getCenter();

    let closestCharacter: Character | null = null;
    let closestDistance = Infinity;

    // Search through all players
    for (const player of Manager.instance.players) {
      // Skip our own player
      if (player === myPlayer) {
        continue;
      }

      // Check all characters of this player
      for (const character of player.characters) {
        // Skip dead characters
        if (character.hp <= 0) {
          continue;
        }

        // Calculate distance
        const [charX, charY] = character.getCenter();
        const distance = Math.sqrt((charX - myX) ** 2 + (charY - myY) ** 2);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCharacter = character;
        }
      }
    }

    return closestCharacter;
  }

  addKeyListener(key: Key, fn: () => void) {
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(fn);
    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void) {
    this.eventHandlers.get(key)?.delete(fn);
  }
}
