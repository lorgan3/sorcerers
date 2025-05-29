import { Controller, Key, keyMap } from "./controller";

export class AiController implements Controller {
  public pressedKeys = 0;

  private eventHandlers = new Map<Key, Set<() => void>>();

  destroy() {}

  isKeyDown(key?: Key) {
    return false;
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
    // @TODO implement ai logic here
    // Access the active character via Manager.instance.getActiveCharacter()
    // Access the map data via Level.instance.terrain
  }

  addKeyListener(key: Key, fn: () => void) {
    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void) {}
}
