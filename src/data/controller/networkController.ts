import { Controller, Key, keyMap } from "./controller";

export class NetworkController implements Controller {
  public pressedKeys = 0;

  private mouseX = 0;
  private mouseY = 0;
  private eventHandlers = new Map<Key, Set<() => void>>();

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

  getLocalMouse() {
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

  deserialize(buffer: [number, number, number]) {
    const changedKeys = this.pressedKeys ^ buffer[0];

    this.pressedKeys = buffer[0];
    this.mouseX = buffer[1];
    this.mouseY = buffer[2];

    this.eventHandlers.forEach((eventHandlers, key) => {
      if (changedKeys & keyMap[key]) {
        eventHandlers.forEach((fn) => fn());
      }
    });
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
