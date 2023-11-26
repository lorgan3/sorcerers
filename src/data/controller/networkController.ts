import { Controller, Key, keyMap } from "./controller";

export class NetworkController implements Controller {
  public pressedKeys = 0;

  destroy() {}

  isKeyDown(key: Key) {
    return !!(this.pressedKeys & keyMap[key]);
  }

  deserialize(buffer: number) {
    this.pressedKeys = buffer;
  }
}
