import { map } from "../../util/math";
import { FIXED_INTERVAL } from "../network/constants";
import { Controller, Key, keyMap } from "./controller";

export class NetworkController implements Controller {
  public pressedKeys = 0;

  private mouseX = 0;
  private mouseY = 0;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private t = 0;
  private eventHandlers = new Map<Key, Set<() => void>>();
  private buffer: [number, number, number] = [0, 0, 0];

  destroy() {}

  isKeyDown(key?: Key) {
    if (!key) {
      return !!this.pressedKeys;
    }

    return !!(this.pressedKeys & keyMap[key]);
  }

  getMouse(): [number, number] {
    return [this.mouseX, this.mouseY];
  }

  getLocalMouse(): [number, number] {
    return [
      map(this.previousMouseX, this.mouseX, this.t),
      map(this.previousMouseY, this.mouseY, this.t),
    ];
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
    return this.buffer;
  }

  deserialize(buffer: [number, number, number]) {
    this.buffer = buffer;
    const changedKeys = this.pressedKeys ^ buffer[0];

    this.pressedKeys = buffer[0];
    this.t = 0;
    this.previousMouseX = this.mouseX;
    this.previousMouseY = this.mouseY;
    this.mouseX = buffer[1];
    this.mouseY = buffer[2];

    this.eventHandlers.forEach((eventHandlers, key) => {
      if (changedKeys & keyMap[key] && this.pressedKeys & keyMap[key]) {
        eventHandlers.forEach((fn) => fn());
      }
    });
  }

  tick(dt: number) {
    this.t = Math.min(1, this.t + dt / 0.06 / FIXED_INTERVAL);
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
}
