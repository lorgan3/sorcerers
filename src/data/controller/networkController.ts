import { Controller, Key, keyMap } from "./controller";

export class NetworkController implements Controller {
  public pressedKeys = 0;
  private mouseX = 0;
  private mouseY = 0;

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

  deserialize(buffer: [number, number, number]) {
    this.pressedKeys = buffer[0];
    this.mouseX = buffer[1];
    this.mouseY = buffer[2];
  }
}
