import { FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { Controller, Key, isKey, keyMap } from "./controller";
import { Viewport } from "../map/viewport";

export class KeyboardController implements Controller {
  private mouseX = 0;
  private mouseY = 0;
  public pressedKeys = 0;
  private touches = 0;

  private serverKeys = 0;
  private serverMouseX = 0;
  private serverMouseY = 0;

  public isHost = false;
  public isTrusted = false;

  private eventHandlers = new Map<Key, Set<() => void>>();
  private scrollEventHandlers = new Set<(event: FederatedWheelEvent) => void>();

  constructor(private target: Viewport) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.target.addListener("pointermove", this.handleMouseMove);
    this.target.addListener("pointerdown", this.handleMouseDown);
    this.target.addListener("pointerup", this.handleMouseUp);
    this.target.addListener("wheel", this.handleScroll);
    window.addEventListener("contextmenu", this.handleContextMenu);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!event.repeat) {
      this.keyDown(event.key);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keyUp(event.key);
  };

  private handleMouseMove = (event: FederatedPointerEvent) => {
    this.mouseMove(
      event.global.x / this.target.scale.x + this.target.left,
      event.global.y / this.target.scale.y + this.target.top
    );
  };

  private handleMouseDown = (event: FederatedPointerEvent) => {
    this.mouseDown(
      event.global.x / this.target.scale.x + this.target.left,
      event.global.y / this.target.scale.y + this.target.top,
      event.button === 0 ? Key.M1 : Key.M2
    );
  };

  private handleMouseUp = (event: FederatedPointerEvent) => {
    this.mouseUp(
      event.global.x / this.target.scale.x + this.target.left,
      event.global.y / this.target.scale.y + this.target.top,
      event.button === 0 ? Key.M1 : Key.M2
    );
  };

  private handleScroll = (event: FederatedWheelEvent) => {
    this.scrollEventHandlers.forEach((fn) => fn(event));
  };

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeListener("pointermove", this.handleMouseMove);
    this.target.removeListener("pointerdown", this.handleMouseDown);
    this.target.removeListener("pointerup", this.handleMouseUp);
    window.removeEventListener("contextmenu", this.handleContextMenu);
  }

  mouseDown(x: number, y: number, key: Key.M1 | Key.M2) {
    this.mouseX = x;
    this.mouseY = y;
    this.pressedKeys |= keyMap[key];
    this.eventHandlers.get(key)?.forEach((fn) => fn());

    if (this.isHost) {
      this.serverMouseX = this.mouseX;
      this.serverMouseY = this.mouseY;
      this.serverKeys = this.pressedKeys;
    }
  }

  mouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;

    if (this.isHost) {
      this.serverMouseX = this.mouseX;
      this.serverMouseY = this.mouseY;
    }
  }

  mouseUp(x: number, y: number, key: Key.M1 | Key.M2) {
    this.pressedKeys &= ~keyMap[key];

    if (this.isHost) {
      this.serverKeys = this.pressedKeys;
    }
  }

  keyDown(key: string) {
    if (isKey(key)) {
      this.pressedKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());

      if (this.isHost) {
        this.serverKeys = this.pressedKeys;
      }
    }
  }

  keyUp(key: string) {
    if (isKey(key)) {
      this.pressedKeys &= ~keyMap[key];

      if (this.isHost) {
        this.serverKeys = this.pressedKeys;
      }
    }
  }

  setKey(key: Key, state: boolean) {
    if (state) {
      this.pressedKeys |= keyMap[key];
      this.serverKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());
    } else {
      this.pressedKeys &= ~keyMap[key];
      this.serverKeys &= ~keyMap[key];
    }

    if (this.isHost) {
      this.serverKeys = this.pressedKeys;
    }
  }

  isKeyDown(key?: Key) {
    // Only check keys that were already sent to the server.
    // This introduces some artificial lag but make movement
    // a lot smoother.

    if (!key) {
      return !!this.serverKeys;
    }

    return !!(this.serverKeys & keyMap[key]);
  }

  isLocalKeyDown(key?: Key) {
    if (!key) {
      return !!this.pressedKeys;
    }

    return !!(this.pressedKeys & keyMap[key]);
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

  addScrollListener(fn: (event: FederatedWheelEvent) => void) {
    this.scrollEventHandlers.add(fn);
  }

  removeScrollListener(fn: (event: FederatedWheelEvent) => void) {
    this.scrollEventHandlers.delete(fn);
  }

  isMouseDown() {
    return this.touches > 0;
  }

  getMouse(): [number, number] {
    return [this.serverMouseX, this.serverMouseY];
  }

  getLocalMouse(): [number, number] {
    return [this.mouseX, this.mouseY];
  }

  resetKeys() {
    this.pressedKeys = 0;
    this.serverKeys = 0;
  }

  serialize(): [number, number, number] {
    if (this.isTrusted) {
      this.serverKeys = this.pressedKeys;
    }

    return [this.pressedKeys, this.mouseX, this.mouseY];
  }

  deserialize(buffer: [number, number, number]): void {
    if (!this.isTrusted) {
      this.serverKeys = buffer[0];
    }

    this.serverMouseX = buffer[1];
    this.serverMouseY = buffer[2];
  }

  handleContextMenu(event: Event) {
    event.preventDefault();
    return false;
  }
}
