import { getLevel, getManager } from "../context";
import { InvalidStrategyError } from "../bot/strategies/invalidStrategyError";
import { Strategy } from "../bot/strategies/strategy";
import { Targeting } from "../bot/targeting";
import { Path } from "../bot/path";
import { Pathfinding } from "../bot/pathfinding";
import { Graph } from "../bot/graph";
import { Node } from "../bot/node";
import { Character } from "../entity/character";

import { Command, CommandType, Controller, Key, keyMap } from "./controller";

// When all strategies have no reachable target, the bot walks to a graph node
// within a preferred distance band, falling back to any pathable node.
// Distances in game-unit space (graph nodes are in game units).
const WANDER_PREFERRED_MIN_SQ = 5 * 5;
const WANDER_PREFERRED_MAX_SQ = 150 * 150;
const WANDER_FALLBACK_MAX_SQ = 300 * 300;

// Cap on wander iterations per turn to prevent runaway loops. The game's
// turn timer ultimately bounds this too, but having a hard ceiling keeps
// behavior predictable.
const MAX_WANDERS_PER_TURN = 5;

export class AiController implements Controller {
  public readonly isBot = true;
  public pressedKeys = 0;
  private mouse: [number, number] = [0, 0];

  private eventHandlers = new Map<Key, Set<() => void>>();
  private strategies: Strategy[] = [];
  private strategy: Strategy | null = null;
  private wanderFollower: Path | null = null;
  private wanderCount = 0;

  destroy() {}

  isKeyDown(key?: Key) {
    if (!key) {
      return !!this.pressedKeys;
    }

    return !!(this.pressedKeys & keyMap[key]);
  }

  getMouse(): [number, number] {
    return this.mouse;
  }

  getLocalMouse(): [number, number] {
    return this.mouse;
  }

  resetKeys() {
    this.pressedKeys = 0;
  }

  setKey(key: Key, state: boolean) {
    if (state) {
      // Edge-triggered: only fire listeners on the up→down transition. Strategies
      // emit KeyDown every tick (e.g. holding Inventory for 120 ticks during the
      // Selecting state), and naive listener firing here would call openSpellBook
      // ~120 times per cast for a no-op.
      const wasDown = !!(this.pressedKeys & keyMap[key]);
      this.pressedKeys |= keyMap[key];
      if (!wasDown) {
        this.eventHandlers.get(key)?.forEach((fn) => fn());
      }
    } else {
      this.pressedKeys &= ~keyMap[key];
    }
  }

  serialize(): [number, number, number] {
    return [this.pressedKeys, ...this.mouse];
  }

  deserialize(_buffer: [number, number, number]) {
    throw new Error("Ai controller cannot be deserialized");
  }

  tick(dt: number) {
    if (this.strategy) {
      try {
        const commands = this.strategy.tick(dt);
        this.parseCommands(commands);

        // Strategy reached Done state — cast already happened (or no-op done).
        // Don't advance further; let the turn timer end the turn.
        if (this.strategy.isDone) {
          this.strategy = null;
        }
      } catch (error) {
        if (error instanceof InvalidStrategyError) {
          console.warn(error);
          this.strategies.shift();
          this.strategy = this.strategies[0] ?? null;
          if (!this.strategy) {
            this.startWander();
          }
        } else {
          throw error;
        }
      }
      return;
    }

    if (this.wanderFollower) {
      const commands = this.wanderFollower.getCommand(dt);
      this.parseCommands(commands);

      if (this.wanderFollower.done || this.wanderFollower.stuck) {
        this.wanderFollower = null;
        this.reevaluate();
      }
    }
  }

  onStart() {
    this.wanderCount = 0;
    this.reevaluate();
  }

  addKeyListener(key: Key, fn: () => void) {
    if (this.eventHandlers.has(key)) {
      this.eventHandlers.get(key)!.add(fn);
    } else {
      this.eventHandlers.set(key, new Set([fn]));
    }

    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void) {
    this.eventHandlers.get(key)?.delete(fn);
  }

  private reevaluate() {
    const self = getManager().getActiveCharacter();
    if (!self) {
      return;
    }

    this.strategies = Targeting.evaluateStrategies(self);
    if (this.strategies.length > 0) {
      this.strategy = this.strategies[0];
    } else {
      this.startWander();
    }
  }

  private startWander() {
    this.strategy = null;
    this.wanderFollower = null;

    if (this.wanderCount >= MAX_WANDERS_PER_TURN) {
      return;
    }
    this.wanderCount++;

    const self = getManager().getActiveCharacter();
    if (!self) {
      return;
    }

    const graph = getLevel().getGraph();
    if (!graph) {
      return;
    }

    const myNode = graph.getClosestNode(...self.bodyFootCenter);

    // Build a shuffled list of all nodes other than ourselves.
    const candidates = graph.getNodes().filter((n) => n !== myNode);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Pass 1: prefer nodes in [5, 150] units — meaningful wandering distance.
    if (this.tryWanderTo(self, myNode, candidates, WANDER_PREFERRED_MIN_SQ, WANDER_PREFERRED_MAX_SQ)) {
      return;
    }

    // Pass 2: accept anything pathable in [0, 300] — last resort so the bot
    // at least moves somewhere rather than staring at a wall.
    this.tryWanderTo(self, myNode, candidates, 0, WANDER_FALLBACK_MAX_SQ);
  }

  private tryWanderTo(
    self: Character,
    myNode: Node,
    candidates: Node[],
    minDistSq: number,
    maxDistSq: number
  ): boolean {
    for (const dest of candidates) {
      const dx = dest.x - myNode.x;
      const dy = dest.y - myNode.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq || distSq > maxDistSq) {
        continue;
      }

      const result = Pathfinding.findPath(myNode, dest);
      if (result.success) {
        this.wanderFollower = new Path(self, result.path);
        return true;
      }
    }
    return false;
  }

  private parseCommands(commands: Command[]) {
    const lastPressedKeys = this.pressedKeys;

    for (let command of commands) {
      switch (command.type) {
        case CommandType.ResetKeys:
          this.pressedKeys = 0;
          break;

        case CommandType.KeyDown:
          this.setKey(command.key, true);
          break;

        case CommandType.KeyUp:
          this.setKey(command.key, false);
          break;

        case CommandType.KeyPress:
          this.setKey(command.key, !(lastPressedKeys & keyMap[command.key]));
          break;

        case CommandType.MouseMove:
          this.mouse = [command.x, command.y];
          break;
      }
    }
  }
}
