import { Controller, Key, isKey, keyMap, keys } from "./controller";

export class KeyboardController implements Controller {
  private mouseX = 0;
  private mouseY = 0;
  public pressedKeys = 0;
  private sentKeys = 0;
  private touches = 0;

  private eventHandlers = new Map<Key, Set<() => void>>();

  constructor(private target: HTMLElement) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.keyDown(event.key);
    event.preventDefault();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keyUp(event.key);
    event.preventDefault();
  };

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  mouseDown(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    this.touches++;
  }

  mouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  mouseUp(x: number, y: number) {
    this.touches--;
  }

  keyDown(key: string) {
    if (isKey(key)) {
      this.pressedKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());
    }
  }

  keyUp(key: string) {
    if (isKey(key)) {
      this.pressedKeys &= ~keyMap[key];
    }
  }

  isKeyDown(key: Key) {
    // Only check keys that were already sent to the server.
    // This introduces some artificial lag but make movement
    // a lot smoother.
    return !!(this.sentKeys & keyMap[key]);
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

  isMouseDown() {
    return this.touches > 0;
  }

  getMouse(): [number, number] {
    return [this.mouseX, this.mouseY];
  }

  serialize() {
    this.sentKeys = this.pressedKeys;
    return this.pressedKeys;
  }

  deserialize(buffer: number): void {
    // Nothing
  }
}
