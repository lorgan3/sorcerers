import { FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { Controller, Key, isKey, keyMap } from "./controller";
import { Viewport } from "../map/viewport";

export class KeyboardController implements Controller {
  public readonly isBot = false;
  private mouseX = 0;
  private mouseY = 0;
  public pressedKeys = 0;
  private touches = 0;
  private activeTouches = new Map<number, { x: number; y: number }>();
  private pinchDistance: number | null = null;
  private suppressTouchCast = false;

  private serverKeys = 0;
  private serverMouseX = 0;
  private serverMouseY = 0;

  public isHost = false;
  public isTrusted = false;

  private eventHandlers = new Map<Key, Set<() => void>>();
  private scrollEventHandlers = new Set<(event: FederatedWheelEvent) => void>();
  private pinchEventHandlers = new Set<(delta: number) => void>();

  constructor(private target: Viewport) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.target.addListener("pointermove", this.handleMouseMove);
    this.target.addListener("pointerdown", this.handleMouseDown);
    this.target.addListener("pointerup", this.handleMouseUp);
    this.target.addListener("pointerupoutside", this.handleMouseUp);
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
    const x = event.global.x / this.target.scale.x + this.target.left;
    const y = event.global.y / this.target.scale.y + this.target.top;

    if (
      event.pointerType === "touch" &&
      this.activeTouches.has(event.pointerId)
    ) {
      this.activeTouches.set(event.pointerId, {
        x: event.global.x,
        y: event.global.y,
      });

      if (this.activeTouches.size >= 2) {
        const distance = this.touchDistance();
        if (this.pinchDistance !== null) {
          const delta = distance - this.pinchDistance;
          if (delta !== 0) {
            this.pinchEventHandlers.forEach((fn) => fn(delta));
          }
        }
        this.pinchDistance = distance;
        return;
      }
    }

    this.mouseMove(x, y);
  };

  private handleMouseDown = (event: FederatedPointerEvent) => {
    const x = event.global.x / this.target.scale.x + this.target.left;
    const y = event.global.y / this.target.scale.y + this.target.top;

    if (event.pointerType === "touch") {
      this.activeTouches.set(event.pointerId, {
        x: event.global.x,
        y: event.global.y,
      });

      if (this.activeTouches.size >= 2) {
        this.pressedKeys &= ~keyMap[Key.M1];
        this.pinchDistance = this.touchDistance();
        return;
      }

      if (this.suppressTouchCast) {
        this.mouseMove(x, y);
        return;
      }
    }

    this.mouseDown(
      x,
      y,
      event.button === 0 ? Key.M1 : event.button === 2 ? Key.M2 : Key.M3
    );
  };

  private handleMouseUp = (event: FederatedPointerEvent) => {
    if (event.pointerType === "touch") {
      this.activeTouches.delete(event.pointerId);
      if (this.activeTouches.size < 2) {
        this.pinchDistance = null;
      }
    }

    this.mouseUp(
      event.global.x / this.target.scale.x + this.target.left,
      event.global.y / this.target.scale.y + this.target.top,
      event.button === 0 ? Key.M1 : event.button === 2 ? Key.M2 : Key.M3
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
    this.target.removeListener("pointerupoutside", this.handleMouseUp);
    window.removeEventListener("contextmenu", this.handleContextMenu);
  }

  mouseDown(x: number, y: number, key: Key.M1 | Key.M2 | Key.M3) {
    this.mouseX = x;
    this.mouseY = y;
    this.pressedKeys |= keyMap[key];
    this.eventHandlers.get(key)?.forEach((fn) => fn());
  }

  mouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  mouseUp(x: number, y: number, key: Key.M1 | Key.M2 | Key.M3) {
    this.pressedKeys &= ~keyMap[key];
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

  setKey(key: Key, state: boolean) {
    if (state) {
      this.pressedKeys |= keyMap[key];
      this.serverKeys |= keyMap[key];
      this.eventHandlers.get(key)?.forEach((fn) => fn());
    } else {
      this.pressedKeys &= ~keyMap[key];
      this.serverKeys &= ~keyMap[key];
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

  addPinchListener(fn: (delta: number) => void) {
    this.pinchEventHandlers.add(fn);
    return () => this.removePinchListener(fn);
  }

  removePinchListener(fn: (delta: number) => void) {
    this.pinchEventHandlers.delete(fn);
  }

  setSuppressTouchCast(value: boolean) {
    this.suppressTouchCast = value;
  }

  private touchDistance(): number {
    const points = [...this.activeTouches.values()];
    if (points.length < 2) return 0;
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.sqrt(dx * dx + dy * dy);
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
    if (this.isTrusted || this.isHost) {
      this.serverKeys = this.pressedKeys;
      this.serverMouseX = this.mouseX;
      this.serverMouseY = this.mouseY;
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
