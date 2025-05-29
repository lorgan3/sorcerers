import { Controller, Key, keyMap } from "./controller";
import { Manager } from "../network/manager";
import { Level } from "../map/level";
import { rectangle6x16 } from "../collision/precomputed/rectangles";

export class AiController implements Controller {
  public pressedKeys = 0;

  private eventHandlers = new Map<Key, Set<() => void>>();

  destroy() {}

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

  tick(dt: number) {
    // Test implementation: find closest enemy and move towards it
    const activeCharacter = Manager.instance.getActiveCharacter();
    if (!activeCharacter) {
      return;
    }

    const activePlayer = Manager.instance.getActivePlayer();
    if (!activePlayer) {
      return;
    }

    // Find the closest enemy character
    const closestEnemy = this.findClosestEnemyCharacter(
      activeCharacter,
      activePlayer
    );

    if (closestEnemy) {
      const [enemyX, enemyY] = closestEnemy.body.position;
      this.moveToPosition(enemyX, enemyY);
    }
  }

  /**
   * Finds the closest enemy character to the active character
   */
  private findClosestEnemyCharacter(activeCharacter: any, activePlayer: any) {
    let closestEnemy = null;
    let closestDistance = Infinity;

    const [currentX, currentY] = activeCharacter.body.position;

    // Check all players
    for (const player of Manager.instance.players) {
      // Skip if it's the same player (not an enemy)
      if (player === activePlayer) {
        continue;
      }

      // Check all characters of this enemy player
      for (const character of player.characters) {
        if (character.hp <= 0) {
          continue; // Skip dead characters
        }

        const [enemyX, enemyY] = character.body.position;
        const distance = Math.sqrt(
          Math.pow(enemyX - currentX, 2) + Math.pow(enemyY - currentY, 2)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = character;
        }
      }
    }

    return closestEnemy;
  }

  /**
   * Moves the bot character as close as possible to the given x and y coordinates.
   * The character can move left, right, and jump, while avoiding falling too deep.
   * @param targetX Target x coordinate
   * @param targetY Target y coordinate
   */
  moveToPosition(targetX: number, targetY: number) {
    const character = Manager.instance.getActiveCharacter();
    if (!character) {
      return;
    }

    const [currentX, currentY] = character.body.position;
    const terrain = Level.instance.terrain;
    const characterMask = rectangle6x16;

    // Calculate horizontal distance to target
    const deltaX = targetX - currentX;
    const deltaY = targetY - currentY;

    // Reset movement keys
    this.setKey(Key.Left, false);
    this.setKey(Key.Right, false);

    // Improved jumping logic
    let shouldJump = false;
    let shouldWalk = false;

    // Check if we're close enough to the target to stop moving
    const distanceToTarget = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const isCloseEnough = distanceToTarget < 3; // Stop when within 3 units

    // Check if we're making progress toward the target
    const isMakingProgress = this.isMakingProgress(
      currentX,
      currentY,
      targetX,
      targetY
    );

    // Horizontal movement logic
    if (Math.abs(deltaX) > 1 && !isCloseEnough && isMakingProgress) {
      // Only move if we're not close enough and making progress
      const direction = Math.sign(deltaX);

      // Check for obstacles that require jumping
      const obstacleAhead = this.hasObstacleAhead(
        currentX,
        currentY,
        direction,
        terrain,
        characterMask
      );

      // Check if we can move horizontally without falling into a dangerous pit
      const canMoveHorizontally = this.canMoveHorizontally(
        currentX,
        currentY,
        direction,
        terrain,
        characterMask
      );

      console.log(
        `AI: Movement check - canMove: ${canMoveHorizontally}, obstacle: ${obstacleAhead}`
      );

      // Only move if we can move safely OR if there's a jumpable obstacle
      if (canMoveHorizontally) {
        shouldWalk = true;

        // If there's an obstacle, jump while walking (ensure horizontal momentum)
        if (obstacleAhead && character.body.grounded) {
          shouldJump = true;
          shouldWalk = true; // Ensure we're walking while jumping for momentum
          console.log("AI: Jumping over obstacle ahead");
        }
      } else {
        // Can't move horizontally - check if there's a wall we can jump over
        if (character.body.grounded) {
          // If we detected a wall blocking movement, try jumping over it
          shouldWalk = true;
          shouldJump = true;
          console.log("AI: Jumping over wall/obstacle");
        } else {
          // Not grounded or no solution - stop moving
          console.log(
            "AI: Cannot move - wall/pit ahead, not grounded or no solution"
          );
        }
      }

      // Set horizontal movement - ALWAYS set this before jumping for momentum
      if (shouldWalk) {
        if (direction > 0) {
          this.setKey(Key.Right, true);
        } else {
          this.setKey(Key.Left, true);
        }
      }
    } else if (isCloseEnough) {
      console.log("AI: Close enough to target, stopping movement");
    } else if (!isMakingProgress) {
      console.log("AI: Not making progress toward target, stopping movement");
    }

    // Jump if target is significantly above us (only if we're also moving horizontally)
    if (
      deltaY < -8 &&
      character.body.grounded &&
      shouldWalk &&
      isMakingProgress
    ) {
      shouldJump = true;
      console.log("AI: Jumping to reach higher target");
    }

    // Jump if we're stuck (only if we're trying to move horizontally)
    if (
      this.isStuck(currentX, currentY, targetX, targetY) &&
      character.body.grounded &&
      shouldWalk &&
      isMakingProgress
    ) {
      shouldJump = true;
      console.log("AI: Jumping because stuck");
    }

    // Set jump key
    this.setKey(Key.Up, shouldJump);

    if (shouldJump) {
      console.log(
        `AI: Jump key set, grounded: ${character.body.grounded}, position: [${currentX}, ${currentY}]`
      );
    }
  }

  private lastPosition: [number, number] = [0, 0];
  private stuckCounter = 0;
  private readonly STUCK_THRESHOLD = 45; // ticks (increased to be less aggressive)

  /**
   * Checks if the character is making progress toward the target
   */
  private isMakingProgress(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number
  ): boolean {
    const currentDistance = Math.sqrt(
      Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
    );

    const lastDistance = Math.sqrt(
      Math.pow(targetX - this.lastPosition[0], 2) +
        Math.pow(targetY - this.lastPosition[1], 2)
    );

    // If we're getting closer to the target, we're making progress
    return currentDistance < lastDistance + 0.5; // Allow small margin for error
  }

  /**
   * Detects if the character is stuck and not making progress towards target
   */
  private isStuck(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number
  ): boolean {
    const currentDistance = Math.sqrt(
      Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
    );

    const lastDistance = Math.sqrt(
      Math.pow(targetX - this.lastPosition[0], 2) +
        Math.pow(targetY - this.lastPosition[1], 2)
    );

    // If we haven't moved much towards the target
    if (Math.abs(currentDistance - lastDistance) < 0.5) {
      this.stuckCounter++;
    } else {
      this.stuckCounter = 0;
    }

    this.lastPosition = [currentX, currentY];

    return this.stuckCounter > this.STUCK_THRESHOLD;
  }

  /**
   * Checks if the character can move horizontally without falling into a dangerous pit
   */
  private canMoveHorizontally(
    currentX: number,
    currentY: number,
    direction: number,
    terrain: any,
    characterMask: any
  ): boolean {
    const lookAheadDistance = 6; // Reduced look ahead distance
    const maxSafeFallDistance = 50; // Characters can fall quite far before taking damage

    const checkX = Math.floor(currentX + direction * lookAheadDistance);

    // Check if there's solid ground at the new position (wall blocking)
    if (
      terrain.collisionMask.collidesWith(
        characterMask,
        checkX,
        Math.floor(currentY)
      )
    ) {
      console.log("AI: Wall blocking horizontal movement");
      return false; // There's a wall blocking us
    }

    // Simple check: how far would we fall at the look-ahead point?
    let fallDistance = 0;
    let checkY = Math.floor(currentY);

    while (fallDistance <= maxSafeFallDistance && checkY < terrain.height) {
      checkY++;
      fallDistance++;

      // If we hit ground, check if the fall distance is safe
      if (terrain.collisionMask.collidesWith(characterMask, checkX, checkY)) {
        if (fallDistance > maxSafeFallDistance) {
          console.log(`AI: Dangerous cliff detected, fall: ${fallDistance}`);
          return false; // Too dangerous
        } else {
          console.log(`AI: Safe fall detected, fall: ${fallDistance}`);
          return true; // Safe to move
        }
      }
    }

    // If we didn't find ground within safe fall distance, it's dangerous
    console.log(
      `AI: Deep pit detected, no ground found within ${maxSafeFallDistance} units`
    );
    return false;
  }

  /**
   * Checks if there's an obstacle directly ahead that requires jumping
   */
  private hasObstacleAhead(
    currentX: number,
    currentY: number,
    direction: number,
    terrain: any,
    characterMask: any
  ): boolean {
    const checkDistance = 6; // Check just ahead of character
    const checkX = Math.floor(currentX + direction * checkDistance);

    // First check if there's a wall at character height (blocking horizontal movement)
    if (
      terrain.collisionMask.collidesWith(
        characterMask,
        checkX,
        Math.floor(currentY)
      )
    ) {
      // Check if this is a walkable slope by seeing if we can step up
      const stepHeight = this.getStepHeight(
        currentX,
        currentY,
        direction,
        terrain,
        characterMask
      );

      // Only jump if the step is significantly too high to walk up (>8 units is too steep)
      // Characters can walk up steps of 3-8 units according to the physics system
      if (stepHeight > 8) {
        console.log(`AI: High obstacle detected, step height: ${stepHeight}`);
        return true;
      } else {
        console.log(`AI: Walkable step detected, step height: ${stepHeight}`);
        return false; // It's a walkable step, don't jump
      }
    }

    // Check for obstacles significantly above character height (like low ceilings)
    // Only check for very low overhangs that would actually block movement
    if (
      terrain.collisionMask.collidesWith(
        characterMask,
        checkX,
        Math.floor(currentY - 12)
      )
    ) {
      console.log("AI: Low ceiling detected");
      return true;
    }

    return false;
  }

  /**
   * Calculates the height of a step in the given direction
   */
  private getStepHeight(
    currentX: number,
    currentY: number,
    direction: number,
    terrain: any,
    characterMask: any
  ): number {
    const checkX = Math.floor(currentX + direction * 6);

    // Find the ground level at the current position
    let currentGroundY = Math.floor(currentY);
    while (
      currentGroundY < terrain.height &&
      !terrain.collisionMask.collidesWith(
        characterMask,
        Math.floor(currentX),
        currentGroundY + 1
      )
    ) {
      currentGroundY++;
    }

    // Find the ground level at the target position
    let targetGroundY = Math.floor(currentY);
    while (
      targetGroundY < terrain.height &&
      !terrain.collisionMask.collidesWith(
        characterMask,
        checkX,
        targetGroundY + 1
      )
    ) {
      targetGroundY++;
    }

    // Return the height difference (positive means step up, negative means step down)
    return currentGroundY - targetGroundY;
  }

  addKeyListener(key: Key, fn: () => void) {
    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void) {}
}
