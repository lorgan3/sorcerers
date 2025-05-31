import { Controller, Key, keyMap } from "./controller";
import { Manager } from "../network/manager";
import { Level } from "../map/level";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { SPELLS, Spell, getSpellCost } from "../spells";
import { TurnState } from "../network/types";
import { Character } from "../entity/character";
import { Player } from "../network/player";
import { EntityType } from "../entity/types";

// Spell terrain interaction types
enum TerrainInteraction {
  BLOCKED_BY_WALLS = "blocked_by_walls",
  PENETRATES_THIN_WALLS = "penetrates_thin_walls",
  IGNORES_TERRAIN = "ignores_terrain",
}

// Define which spells can/cannot go through terrain
const SPELL_TERRAIN_INTERACTION: Record<string, TerrainInteraction> = {
  Balterie: TerrainInteraction.BLOCKED_BY_WALLS,
  Vollzanbel: TerrainInteraction.BLOCKED_BY_WALLS,
  Reamstroha: TerrainInteraction.BLOCKED_BY_WALLS,
  Ignis: TerrainInteraction.BLOCKED_BY_WALLS,
  Nephtear: TerrainInteraction.BLOCKED_BY_WALLS,
  Doragate: TerrainInteraction.PENETRATES_THIN_WALLS,
  Catastravia: TerrainInteraction.PENETRATES_THIN_WALLS,
  // Spells that ignore terrain completely
  Bakuretsu: TerrainInteraction.IGNORES_TERRAIN,
  Excalibur: TerrainInteraction.IGNORES_TERRAIN,
  Waldgose: TerrainInteraction.IGNORES_TERRAIN,
  "Gates of babylon": TerrainInteraction.IGNORES_TERRAIN,
  Reelseiden: TerrainInteraction.IGNORES_TERRAIN,
  Fürwehrer: TerrainInteraction.IGNORES_TERRAIN,
  Eisherz: TerrainInteraction.IGNORES_TERRAIN,
  Auserlese: TerrainInteraction.IGNORES_TERRAIN,
  // Beam spells that go through terrain
  Zoltraak: TerrainInteraction.IGNORES_TERRAIN,
};

export class AiController implements Controller {
  public pressedKeys = 0;

  private eventHandlers = new Map<Key, Set<() => void>>();

  // Spell casting state management
  private spellCastingState:
    | "idle"
    | "selecting"
    | "aiming"
    | "holding"
    | "casting" = "idle";
  private spellCastingTimer = 0;
  private currentStrategy: any = null;
  private hasActedThisTurn = false;

  destroy() {}

  isKeyDown(key?: Key) {
    if (!key) {
      return !!this.pressedKeys;
    }

    return !!(this.pressedKeys & keyMap[key]);
  }

  private targetMouseX = 0;
  private targetMouseY = 0;

  getMouse(): [number, number] {
    return [this.targetMouseX, this.targetMouseY];
  }

  getLocalMouse(): [number, number] {
    return this.getMouse();
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
    // Strategic AI implementation
    const activeCharacter = Manager.instance.getActiveCharacter();
    const activePlayer = Manager.instance.getActivePlayer();
    const turnState = Manager.instance.turnState;

    if (!activeCharacter || !activePlayer) {
      return;
    }

    // Reset state when turn changes
    if (turnState !== TurnState.Ongoing) {
      this.resetSpellCastingState();
      return;
    }

    // Handle ongoing spell casting process
    if (this.spellCastingState !== "idle") {
      this.handleSpellCasting(dt, activeCharacter, activePlayer);
      return;
    }

    // Only make new decisions if we haven't acted this turn
    if (this.hasActedThisTurn) {
      return;
    }

    // Strategic decision making
    const strategy = this.analyzeStrategicSituation(
      activeCharacter,
      activePlayer
    );

    if (strategy.action === "cast_spell") {
      this.startSpellCasting(strategy, activeCharacter, activePlayer);
    } else if (strategy.action === "move_to_position") {
      this.moveToPosition(strategy.targetX!, strategy.targetY!);
    } else if (strategy.action === "wait") {
      console.log("AI: Waiting for better opportunity");
      this.hasActedThisTurn = true; // Mark as acted to prevent repeated decisions
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

  /**
   * Strategic AI decision making system
   */
  private analyzeStrategicSituation(
    activeCharacter: Character,
    activePlayer: Player
  ) {
    const enemies = this.getAllEnemies(activePlayer);
    const mana = activePlayer.mana;

    console.log(
      `AI: Analyzing situation - Mana: ${mana}, Enemies: ${enemies.length}`
    );

    // Emergency situations - prioritize survival
    if (activeCharacter.hp < 30) {
      return this.analyzeSurvivalStrategy(
        activeCharacter,
        activePlayer,
        enemies,
        mana
      );
    }

    // Offensive opportunities - look for high-value targets
    const offensiveStrategy = this.analyzeOffensiveStrategy(
      activeCharacter,
      activePlayer,
      enemies,
      mana
    );
    if (offensiveStrategy.action === "cast_spell") {
      return offensiveStrategy;
    }

    // Movement strategy - get into better position
    const movementStrategy = this.analyzeMovementStrategy(
      activeCharacter,
      activePlayer,
      enemies
    );
    if (movementStrategy.action === "move_to_position") {
      return movementStrategy;
    }

    // Item collection strategy - check for nearby valuable items
    const itemStrategy = this.analyzeItemStrategy(
      activeCharacter,
      activePlayer
    );
    if (itemStrategy.action === "move_to_position") {
      return itemStrategy;
    }

    // Default: wait and conserve mana
    return { action: "wait" as const };
  }

  private analyzeItemStrategy(character: Character, player: Player) {
    const [myX, myY] = character.body.position;
    const nearbyItems: any[] = [];

    // Find nearby items within reasonable range
    Level.instance.withNearbyEntities(myX * 6, myY * 6, 200, (entity) => {
      // Check if it's an item (Potion or MagicScroll)
      if (
        entity.type === EntityType.MagicScroll ||
        entity.type === EntityType.Potion
      ) {
        const [itemX, itemY] = entity.getCenter();
        const distance = Math.sqrt(
          (itemX / 6 - myX) ** 2 + (itemY / 6 - myY) ** 2
        );
        nearbyItems.push({
          entity,
          distance,
          x: itemX / 6,
          y: itemY / 6,
        });
      }
    });

    if (nearbyItems.length === 0) {
      return { action: "wait" as const };
    }

    // Evaluate items by priority
    let bestItem: any = null;
    let bestScore = 0;

    for (const item of nearbyItems) {
      const score = this.evaluateItemValue(
        item.entity,
        character,
        player,
        item.distance
      );
      if (score > bestScore && score > 30) {
        // Only collect if item is valuable enough
        bestScore = score;
        bestItem = item;
      }
    }

    if (bestItem && this.canReachPosition(character, bestItem.x, bestItem.y)) {
      console.log(
        `AI: Moving to collect item at [${bestItem.x}, ${bestItem.y}] (score: ${bestScore})`
      );
      return {
        action: "move_to_position" as const,
        targetX: bestItem.x,
        targetY: bestItem.y,
        reason: "collect_item",
      };
    }

    return { action: "wait" as const };
  }

  private evaluateItemValue(
    item: any,
    character: Character,
    player: Player,
    distance: number
  ): number {
    let score = 0;

    // Base score decreases with distance
    const distanceScore = Math.max(0, 100 - distance * 2);

    if (item.type === EntityType.Potion) {
      // Health potions are more valuable when low on health
      if (item.potionType === 0 || item.potionType === 2) {
        // HealthPotion types
        const healthPercent = character.hp / 100;
        if (healthPercent < 0.5) {
          score = 80 + (1 - healthPercent) * 40; // Higher score when lower health
        } else if (healthPercent < 0.8) {
          score = 40;
        } else {
          score = 10; // Still somewhat valuable when healthy
        }
      }

      // Mana potions are valuable when low on mana
      if (item.potionType === 1 || item.potionType === 3) {
        // ManaPotion types
        const manaPercent = player.mana / 100; // Assuming max mana around 100
        if (manaPercent < 0.3) {
          score = 70 + (1 - manaPercent) * 30;
        } else if (manaPercent < 0.6) {
          score = 40;
        } else {
          score = 15; // Still valuable for future turns
        }
      }
    } else if (item.type === EntityType.MagicScroll) {
      // Magic scrolls boost element values - always valuable
      score = 60;

      // Extra valuable if the element is currently weak
      if (item.element) {
        const elementValue = Manager.instance.getElementValue(item.element);
        if (elementValue < 1.0) {
          score += 30; // Boost weak elements
        }
      }
    }

    // Apply distance penalty
    score = score * (distanceScore / 100);

    return score;
  }

  private canReachPosition(
    character: Character,
    targetX: number,
    targetY: number
  ): boolean {
    const [currentX, currentY] = character.body.position;
    const distance = Math.sqrt(
      (targetX - currentX) ** 2 + (targetY - currentY) ** 2
    );

    // Don't go too far for items (reasonable range)
    if (distance > 100) {
      return false;
    }

    // Simple reachability check - could be enhanced with pathfinding
    return true;
  }

  private analyzeSurvivalStrategy(
    character: Character,
    player: Player,
    enemies: Character[],
    mana: number
  ) {
    console.log("AI: Low health, analyzing survival options");

    // Teleport to safety if available and affordable
    const teleportSpell = SPELLS.find((s) => s.name === "Fürwehrer");
    if (teleportSpell && mana >= getSpellCost(teleportSpell)) {
      const safePosition = this.findSafePosition(character, enemies);
      if (safePosition) {
        return {
          action: "cast_spell" as const,
          spell: teleportSpell,
          targetX: safePosition[0],
          targetY: safePosition[1],
          reason: "emergency_teleport",
        };
      }
    }

    // Shield for protection
    const shieldSpell = SPELLS.find((s) => s.name === "Felsenschild");
    if (shieldSpell && mana >= getSpellCost(shieldSpell)) {
      return {
        action: "cast_spell" as const,
        spell: shieldSpell,
        reason: "emergency_shield",
      };
    }

    return { action: "wait" as const };
  }

  private analyzeOffensiveStrategy(
    character: Character,
    player: Player,
    enemies: Character[],
    mana: number
  ) {
    const [myX, myY] = character.body.position;

    // Find best target and spell combination
    let bestStrategy: any = { action: "wait" as const, score: 0 };
    let bestBlockedStrategy: any = { action: "wait" as const, score: 0 };

    for (const enemy of enemies) {
      const [enemyX, enemyY] = enemy.body.position;
      const distance = Math.sqrt((enemyX - myX) ** 2 + (enemyY - myY) ** 2);

      // Evaluate each affordable spell
      for (const spell of SPELLS) {
        const cost = getSpellCost(spell);
        if (cost > mana) continue;

        const strategy = this.evaluateSpellAgainstTarget(
          spell,
          character,
          enemy,
          distance,
          mana
        );

        if (strategy.reason === "blocked_by_terrain") {
          // Store the best blocked strategy for potential repositioning
          if (strategy.score > bestBlockedStrategy.score) {
            // Re-evaluate the spell as if it could hit to get its potential score
            const potentialStrategy = this.evaluateSpellPotential(
              spell,
              character,
              enemy,
              distance,
              mana
            );
            if (potentialStrategy.score > bestBlockedStrategy.score) {
              bestBlockedStrategy = {
                action: "move_to_position" as const,
                spell: spell,
                target: enemy,
                targetX: enemyX,
                targetY: enemyY,
                score: potentialStrategy.score,
                reason: "reposition_for_spell",
              };
            }
          }
        } else if (strategy.score > bestStrategy.score) {
          bestStrategy = {
            action: "cast_spell" as const,
            spell: spell,
            target: enemy,
            targetX: enemyX,
            targetY: enemyY,
            score: strategy.score,
            reason: strategy.reason,
          };
        }
      }
    }

    // If we have a good spell available, use it
    if (bestStrategy.score > 30 && bestStrategy.action === "cast_spell") {
      console.log(
        `AI: Found offensive opportunity: ${bestStrategy.reason} (score: ${bestStrategy.score})`
      );
      return bestStrategy;
    }

    // If we have a good blocked spell and it's worth repositioning for
    if (bestBlockedStrategy.score > 50) {
      const repositionTarget = this.findPositionToHitTarget(
        bestBlockedStrategy.spell,
        character,
        bestBlockedStrategy.target
      );

      if (repositionTarget) {
        console.log(
          `AI: Repositioning to cast ${bestBlockedStrategy.spell.name} (score: ${bestBlockedStrategy.score})`
        );
        return {
          action: "move_to_position" as const,
          targetX: repositionTarget[0],
          targetY: repositionTarget[1],
          reason: "reposition_for_spell",
          plannedSpell: bestBlockedStrategy.spell,
          plannedTarget: bestBlockedStrategy.target,
        };
      }
    }

    return { action: "wait" as const };
  }

  /**
   * Evaluates a spell's potential score ignoring terrain blocking
   * Used to determine if it's worth repositioning for a blocked spell
   */
  private evaluateSpellPotential(
    spell: Spell,
    caster: Character,
    target: Character,
    distance: number,
    mana: number
  ) {
    let score = 0;
    let reason = "";

    // Calculate element multiplier for this spell
    const elementMultiplier = this.calculateElementMultiplier(spell);

    // Same scoring logic as evaluateSpellAgainstTarget but without terrain check
    if (spell.name === "Bakuretsu" && target.hp < 60) {
      score = 100;
      reason = "bakuretsu_kill_opportunity";
    } else if (spell.name === "Zoltraak" && distance < 100) {
      score = 80;
      reason = "zoltraak_beam_attack";
    } else if (spell.name === "Vollzanbel" && distance > 50) {
      score = 70;
      reason = "homing_missile_long_range";
    } else if (spell.name === "Excalibur" && target.hp < 80) {
      score = 85;
      reason = "excalibur_high_damage";
    } else if (spell.name === "Waldgose" && target.hp < 70) {
      score = 95;
      reason = "meteor_devastation";
    } else if (spell.name === "Ignis" && distance < 50) {
      score = 40;
      reason = "fireball_medium_range";
    } else if (spell.name === "Nephtear" && distance > 30) {
      score = 50;
      reason = "ice_spike_long_range";
    }

    // Apply element multiplier to base score
    score *= elementMultiplier;

    // Adjust score based on mana efficiency
    const cost = getSpellCost(spell);
    const efficiency = score / Math.max(cost, 1);
    score = efficiency * 10; // Normalize

    // Add element bonus to reason if significant
    if (elementMultiplier > 1.2) {
      reason += "_strong_elements";
    } else if (elementMultiplier < 0.8) {
      reason += "_weak_elements";
    }

    return { score, reason };
  }

  private analyzeMovementStrategy(
    character: Character,
    player: Player,
    enemies: Character[]
  ) {
    if (enemies.length === 0) return { action: "wait" as const };

    // Find best positioning relative to enemies
    const bestTarget = this.findBestTarget(character, enemies);
    if (bestTarget) {
      const [targetX, targetY] = bestTarget.body.position;
      const optimalPosition = this.findOptimalAttackPosition(
        character,
        bestTarget
      );

      if (optimalPosition) {
        return {
          action: "move_to_position" as const,
          targetX: optimalPosition[0],
          targetY: optimalPosition[1],
          reason: "positioning_for_attack",
        };
      }
    }

    return { action: "wait" as const };
  }

  private resetSpellCastingState() {
    this.spellCastingState = "idle";
    this.spellCastingTimer = 0;
    this.currentStrategy = null;
    this.hasActedThisTurn = false;
    this.setKey(Key.M1, false); // Ensure mouse button is released
  }

  private startSpellCasting(
    strategy: any,
    character: Character,
    player: Player
  ) {
    if (!strategy.spell) return;

    console.log(`AI: Starting spell casting: ${strategy.reason}`);

    this.currentStrategy = strategy;
    this.spellCastingState = "selecting";
    this.spellCastingTimer = 0;
    this.hasActedThisTurn = true;

    // Select the spell
    Manager.instance.selectSpell(strategy.spell, player);

    // Set target position for mouse cursor if needed
    if (strategy.targetX !== undefined && strategy.targetY !== undefined) {
      // Convert to screen coordinates (multiply by 6 for pixel coordinates)
      this.targetMouseX = strategy.targetX * 6;
      this.targetMouseY = strategy.targetY * 6;
      console.log(
        `AI: Aiming at target: [${this.targetMouseX}, ${this.targetMouseY}]`
      );
    } else {
      // Default to character position if no specific target
      const [charX, charY] = character.body.position;
      this.targetMouseX = charX * 6;
      this.targetMouseY = charY * 6;
    }
  }

  private handleSpellCasting(dt: number, character: Character, player: Player) {
    this.spellCastingTimer += dt;

    switch (this.spellCastingState) {
      case "selecting":
        // Wait a bit for spell selection to process
        if (this.spellCastingTimer > 100) {
          this.spellCastingState = "aiming";
          this.spellCastingTimer = 0;
          console.log(`AI: Spell selected, now aiming`);
        }
        break;

      case "aiming":
        // Wait a bit for aiming to be set
        if (this.spellCastingTimer > 50) {
          this.spellCastingState = "holding";
          this.spellCastingTimer = 0;
          this.setKey(Key.M1, true);
          console.log(
            `AI: Holding mouse button for ${this.currentStrategy?.spell?.name}`
          );
        }
        break;

      case "holding":
        // Hold mouse button for a duration
        if (this.spellCastingTimer > 200) {
          this.spellCastingState = "casting";
          this.spellCastingTimer = 0;
          this.setKey(Key.M1, false);
          console.log(
            `AI: Released mouse button - casting ${this.currentStrategy?.spell?.name}`
          );
        }
        break;

      case "casting":
        // Wait a bit after casting before returning to idle
        if (this.spellCastingTimer > 100) {
          this.resetSpellCastingState();
          console.log(`AI: Spell casting complete`);
        }
        break;
    }
  }

  // Helper methods for strategic analysis
  private getAllEnemies(activePlayer: Player): Character[] {
    const enemies: Character[] = [];
    for (const player of Manager.instance.players) {
      if (player !== activePlayer) {
        for (const character of player.characters) {
          if (character.hp > 0) {
            enemies.push(character);
          }
        }
      }
    }
    return enemies;
  }

  private findBestTarget(
    character: Character,
    enemies: Character[]
  ): Character | null {
    if (enemies.length === 0) return null;

    const [myX, myY] = character.body.position;
    let bestTarget = enemies[0];
    let bestScore = 0;

    for (const enemy of enemies) {
      const [enemyX, enemyY] = enemy.body.position;
      const distance = Math.sqrt((enemyX - myX) ** 2 + (enemyY - myY) ** 2);

      // Score based on: low health (easier kill) + close distance
      const healthScore = ((100 - enemy.hp) / 100) * 50; // 0-50 points
      const distanceScore = Math.max(0, 50 - distance); // 0-50 points
      const totalScore = healthScore + distanceScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }

  /**
   * Calculates the element multiplier for a spell based on current element values
   */
  private calculateElementMultiplier(spell: Spell): number {
    if (!spell.elements || spell.elements.length === 0) {
      return 1.0; // No elements, no bonus/penalty
    }

    let totalMultiplier = 0;
    for (const element of spell.elements) {
      const elementValue = Manager.instance.getElementValue(element);
      totalMultiplier += elementValue;
    }

    // Average the element values for spells with multiple elements
    const averageMultiplier = totalMultiplier / spell.elements.length;

    // Normalize around 1.0 (element values typically range from ~0.5 to ~2.5)
    // Convert to a more reasonable multiplier range (0.6 to 1.4)
    return 0.6 + (averageMultiplier - 0.5) * 0.4;
  }

  private evaluateSpellAgainstTarget(
    spell: Spell,
    caster: Character,
    target: Character,
    distance: number,
    mana: number
  ) {
    let score = 0;
    let reason = "";

    const [casterX, casterY] = caster.body.position;
    const [targetX, targetY] = target.body.position;

    // First check if the spell can actually hit the target
    const canHit = this.canSpellHitTarget(
      spell,
      casterX,
      casterY,
      targetX,
      targetY
    );

    if (!canHit) {
      // Spell is blocked by terrain - heavily penalize or return 0
      console.log(`AI: ${spell.name} blocked by terrain to target`);
      return { score: 0, reason: "blocked_by_terrain" };
    }

    // Calculate element multiplier for this spell
    const elementMultiplier = this.calculateElementMultiplier(spell);

    // High-damage spells against low-health targets
    if (spell.name === "Bakuretsu" && target.hp < 60) {
      score = 100;
      reason = "bakuretsu_kill_opportunity";
    } else if (spell.name === "Zoltraak" && distance < 100) {
      score = 80;
      reason = "zoltraak_beam_attack";
    } else if (spell.name === "Vollzanbel" && distance > 50) {
      score = 70;
      reason = "homing_missile_long_range";
    } else if (spell.name === "Excalibur" && target.hp < 80) {
      score = 85;
      reason = "excalibur_high_damage";
    } else if (spell.name === "Waldgose" && target.hp < 70) {
      score = 95;
      reason = "meteor_devastation";
    } else if (spell.name === "Ignis" && distance < 50) {
      score = 40;
      reason = "fireball_medium_range";
    } else if (spell.name === "Nephtear" && distance > 30) {
      score = 50;
      reason = "ice_spike_long_range";
    }

    // Apply element multiplier to base score
    score *= elementMultiplier;

    // Adjust score based on mana efficiency
    const cost = getSpellCost(spell);
    const efficiency = score / Math.max(cost, 1);
    score = efficiency * 10; // Normalize

    // Add element bonus to reason if significant
    if (elementMultiplier > 1.2) {
      reason += "_strong_elements";
    } else if (elementMultiplier < 0.8) {
      reason += "_weak_elements";
    }

    console.log(
      `AI: ${spell.name} score: ${score.toFixed(
        1
      )}, element multiplier: ${elementMultiplier.toFixed(
        2
      )}, elements: ${spell.elements.join(", ")}`
    );

    return { score, reason };
  }

  private findSafePosition(
    character: Character,
    enemies: Character[]
  ): [number, number] | null {
    const [myX, myY] = character.body.position;
    const terrain = Level.instance.terrain;

    // Try positions in a radius around current position
    for (let radius = 20; radius <= 100; radius += 20) {
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = (angle * Math.PI) / 180;
        const testX = Math.floor(myX + Math.cos(rad) * radius);
        const testY = Math.floor(myY + Math.sin(rad) * radius);

        // Check if position is safe (far from enemies and not in terrain)
        if (this.isPositionSafe(testX, testY, enemies, terrain)) {
          return [testX, testY];
        }
      }
    }

    return null;
  }

  private isPositionSafe(
    x: number,
    y: number,
    enemies: Character[],
    terrain: any
  ): boolean {
    // Check if position is in solid terrain
    if (terrain.collisionMask.collidesWith(rectangle6x16, x, y)) {
      return false;
    }

    // Check distance from enemies
    for (const enemy of enemies) {
      const [enemyX, enemyY] = enemy.body.position;
      const distance = Math.sqrt((enemyX - x) ** 2 + (enemyY - y) ** 2);
      if (distance < 50) {
        // Too close to enemy
        return false;
      }
    }

    return true;
  }

  private findOptimalAttackPosition(
    caster: Character,
    target: Character
  ): [number, number] | null {
    const [targetX, targetY] = target.body.position;
    const [myX, myY] = caster.body.position;

    // Find position that's optimal range for most spells (medium distance)
    const optimalDistance = 40;
    const angle = Math.atan2(targetY - myY, targetX - myX);

    const optimalX = Math.floor(targetX - Math.cos(angle) * optimalDistance);
    const optimalY = Math.floor(targetY - Math.sin(angle) * optimalDistance);

    return [optimalX, optimalY];
  }

  /**
   * Checks if a spell can hit the target considering terrain blocking
   */
  private canSpellHitTarget(
    spell: Spell,
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number
  ): boolean {
    const interaction = SPELL_TERRAIN_INTERACTION[spell.name];

    // If spell ignores terrain, it can always hit
    if (interaction === TerrainInteraction.IGNORES_TERRAIN) {
      return true;
    }

    // Check line of sight for spells that can be blocked
    if (interaction === TerrainInteraction.BLOCKED_BY_WALLS) {
      return this.hasLineOfSight(casterX, casterY, targetX, targetY, false);
    }

    // For spells that penetrate thin walls, use more lenient check
    if (interaction === TerrainInteraction.PENETRATES_THIN_WALLS) {
      return this.hasLineOfSight(casterX, casterY, targetX, targetY, true);
    }

    // Default: assume spell can hit (for spells not in our list)
    return true;
  }

  /**
   * Performs line-of-sight check between two points
   * @param allowThinWalls If true, allows penetration through thin walls (1-2 pixels thick)
   */
  private hasLineOfSight(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    allowThinWalls: boolean = false
  ): boolean {
    const terrain = Level.instance.terrain;
    const characterMask = rectangle6x16;

    // Use Bresenham's line algorithm to check each point along the line
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let currentX = Math.floor(x1);
    let currentY = Math.floor(y1);
    const endX = Math.floor(x2);
    const endY = Math.floor(y2);

    let consecutiveWallPixels = 0;
    const maxWallThickness = allowThinWalls ? 2 : 0;

    while (true) {
      // Check if current position has terrain collision
      if (
        terrain.collisionMask.collidesWith(characterMask, currentX, currentY)
      ) {
        consecutiveWallPixels++;

        // If we hit a wall thicker than allowed, line of sight is blocked
        if (consecutiveWallPixels > maxWallThickness) {
          return false;
        }
      } else {
        // Reset wall pixel counter when we're in open space
        consecutiveWallPixels = 0;
      }

      // Check if we've reached the target
      if (currentX === endX && currentY === endY) {
        break;
      }

      // Bresenham's algorithm step
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currentX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currentY += sy;
      }
    }

    return true;
  }

  /**
   * Finds a position where the caster can hit the target with the given spell
   */
  private findPositionToHitTarget(
    spell: Spell,
    caster: Character,
    target: Character
  ): [number, number] | null {
    const [casterX, casterY] = caster.body.position;
    const [targetX, targetY] = target.body.position;

    // If we can already hit the target, no need to move
    if (this.canSpellHitTarget(spell, casterX, casterY, targetX, targetY)) {
      return null;
    }

    // Try positions in a circle around the target at various distances
    const distances = [30, 50, 70, 100];
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];

    for (const distance of distances) {
      for (const angleDeg of angles) {
        const angle = (angleDeg * Math.PI) / 180;
        const testX = Math.floor(targetX + Math.cos(angle) * distance);
        const testY = Math.floor(targetY + Math.sin(angle) * distance);

        // Check if this position is safe and has line of sight to target
        if (
          this.isPositionSafe(testX, testY, [target], Level.instance.terrain) &&
          this.canSpellHitTarget(spell, testX, testY, targetX, targetY)
        ) {
          return [testX, testY];
        }
      }
    }

    return null;
  }

  addKeyListener(key: Key, fn: () => void) {
    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void) {}
}
