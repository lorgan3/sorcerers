import { FederatedPointerEvent } from "pixi.js";
import { Controller, Key, isKey, keyMap } from "./controller";
import { Viewport } from "pixi-viewport";

export class KeyboardController implements Controller {
  private mouseX = 0;
  private mouseY = 0;
  public pressedKeys = 0;
  private sentKeys = 0;
  private touches = 0;

  private eventHandlers = new Map<Key, Set<() => void>>();

  constructor(private target: Viewport) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.target.addListener("pointermove", this.handleMouseMove);
    this.target.addListener("pointerdown", this.handleMouseDown);
    this.target.addListener("pointerup", this.handleMouseUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.keyDown(event.key);
    event.preventDefault();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keyUp(event.key);
    event.preventDefault();
  };

  private handleMouseMove = (event: FederatedPointerEvent) => {
    this.mouseMove(
      event.global.x + this.target.scale.x + this.target.left,
      event.global.y + this.target.scale.y + this.target.top
    );
  };

  private handleMouseDown = (event: FederatedPointerEvent) => {
    this.mouseDown(
      event.global.x + this.target.scale.x + this.target.left,
      event.global.y + this.target.scale.y + this.target.top
    );
  };

  private handleMouseUp = (event: FederatedPointerEvent) => {
    this.mouseUp(
      event.global.x + this.target.scale.x + this.target.left,
      event.global.y + this.target.scale.y + this.target.top
    );
  };

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("pointermove", this.handleMouseMove);
    this.target.removeEventListener("pointerdown", this.handleMouseDown);
    this.target.removeEventListener("pointerup", this.handleMouseUp);
  }

  mouseDown(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    this.pressedKeys |= keyMap[Key.M1];
    this.eventHandlers.get(Key.M1)?.forEach((fn) => fn());
  }

  mouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  mouseUp(x: number, y: number) {
    this.pressedKeys &= ~keyMap[Key.M1];
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

  isKeyDown(key?: Key) {
    // Only check keys that were already sent to the server.
    // This introduces some artificial lag but make movement
    // a lot smoother.

    if (!key) {
      return !!this.sentKeys;
    }

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
    return [this.pressedKeys, this.mouseX, this.mouseY];
  }

  deserialize(buffer: [number, number, number]): void {
    // Nothing
  }
}
