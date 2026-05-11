import { InvalidStrategyError } from "../bot/strategies/invalidStrategyError";
import { Strategy } from "../bot/strategies/strategy";
import { Targeting } from "../bot/targeting";

import { Server } from "../network/server";
import { Command, CommandType, Controller, Key, keyMap } from "./controller";

export class AiController implements Controller {
  public pressedKeys = 0;
  private mouse: [number, number] = [0, 0];

  private eventHandlers = new Map<Key, Set<() => void>>();
  private strategies: Strategy[] = [];
  private strategy: Strategy | null = null;

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
      this.pressedKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());
    } else {
      this.pressedKeys &= ~keyMap[key];
    }
  }

  serialize(): [number, number, number] {
    return [this.pressedKeys, ...this.mouse];
  }

  deserialize(buffer: [number, number, number]) {
    throw new Error("Ai controller cannot be deserialized");
  }

  tick(dt: number) {
    if (this.strategy) {
      try {
        const commands = this.strategy.tick(dt);
        this.parseCommands(commands);
      } catch (error) {
        if (error instanceof InvalidStrategyError) {
          console.warn(error);
          this.strategy = this.strategies[0];
        } else {
          throw error;
        }
      }
    }
  }

  onStart() {
    const self = Server.instance.getActiveCharacter()!;
    this.strategies = Targeting.evaluateStrategies(self);
    this.strategy = this.strategies[0];
  }

  getNextStrategy(): Strategy {
    while (this.strategies.length > 0) {
      const strategy = this.strategies[0];
      const evaluation = strategy.getNextEvaluation();

      if (!evaluation) {
        return strategy;
      }

      this.strategies.pop();
    }

    throw new Error("No strategies left");
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
