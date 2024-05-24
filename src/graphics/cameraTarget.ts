import { KeyboardController } from "../data/controller/keyboardController";
import { Key } from "../data/controller/controller";
import { Spawnable } from "../data/entity/types";
import { getDistance } from "../util/math";
import { Manager } from "../data/network/manager";
import { Viewport } from "../data/map/viewport";

export class CameraTarget {
  private static maxScale = 1.5;
  private static zoomSpeed = 0.01;
  private static maxZoomScale = 10;
  private static highlightDelay = 90;
  private static continueDelay = 120;

  private static deadzone = 100;
  private static maxSpeedFactor = 0.2;
  private static acceleration = 0.7;
  private static manualAcceleration = 0.35;
  private static horizontalMargin = 0;
  private static verticalMargin = 0;

  static shakeAmount = 10;
  static shakeIntensity = 12;
  static shakeInterval = 25;

  private controller: KeyboardController | undefined;
  private target?: Spawnable;
  private callback?: () => void;
  highlightQueue: Array<{
    target: Spawnable;
    callback?: () => void;
  }> = [];
  private position: [number, number];
  private lastTargetPosition: [number, number] = [0, 0];

  private attached = true;
  private oldCDown = false;
  private intervalId = -1;

  private speed = 0;
  private scale = 1;
  private time = 0;

  constructor(private viewport: Viewport) {
    this.position = [
      this.viewport.worldWidth / 2,
      this.viewport.worldHeight / 2,
    ];
  }

  tick(dt: number) {
    if (!this.controller || this.intervalId !== -1) {
      return;
    }

    let position: [number, number] = this.lastTargetPosition;

    this.time += dt;
    if (this.time >= CameraTarget.highlightDelay && this.callback) {
      this.callback();
      this.callback = undefined;
    }

    if (this.highlightQueue.length) {
      if (this.time >= CameraTarget.continueDelay) {
        const entry = this.highlightQueue.pop()!;
        this.time = 0;
        this.target = entry.target;
        this.callback = entry.callback;
      }
    }

    if (
      Manager.instance.self?.activeCharacter &&
      Manager.instance.self?.activeCharacter?.body.velocity !== 0
    ) {
      this.attached = true;

      if (this.target !== Manager.instance.self?.activeCharacter) {
        this.speed = 0;
        this.target = Manager.instance.self?.activeCharacter;
      }
    }

    if (this.target && this.attached) {
      position = this.target.getCenter();
      this.lastTargetPosition = position;
    }

    if (this.controller.isLocalKeyDown(Key.C)) {
      position = this.controller.getLocalMouse();

      if (!this.oldCDown) {
        this.attached = false;
        this.oldCDown = true;
        this.lastTargetPosition = position;
      }
    } else if (this.oldCDown) {
      this.oldCDown = false;

      if (
        getDistance(
          ...this.controller.getLocalMouse(),
          ...this.lastTargetPosition
        ) < CameraTarget.deadzone
      ) {
        this.attached = true;
      }

      this.lastTargetPosition = this.controller.getLocalMouse();
    }

    position = this.clamp(position);

    const dx = (position[0] - this.position[0]) * this.scale;
    const dy = (position[1] - this.position[1]) * this.scale;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    const maxSpeed = distance * CameraTarget.maxSpeedFactor;

    if (this.speed === 0 && distance <= CameraTarget.deadzone) {
      return;
    }

    const idt = Math.pow(dt, 2) / 2;
    let speed = this.speed * dt;
    let acc = 0;

    if (this.speed < maxSpeed) {
      acc = this.attached
        ? CameraTarget.acceleration
        : CameraTarget.manualAcceleration;
    } else {
      acc = maxSpeed - this.speed;
    }
    speed += acc * idt;

    if (adx === 0 && ady === 0) {
      this.speed = 0;
      return;
    }

    const sum = adx + ady;
    const sx = sum ? (speed * adx) / sum : 0;
    const sy = sum ? (speed * ady) / sum : 0;
    this.speed += acc * dt;

    if (adx > sx && adx > 1) {
      this.position[0] += Math.sign(dx) * sx;
    } else {
      this.position[0] = position[0];
    }

    if (ady > sy && ady > 1) {
      this.position[1] += Math.sign(dy) * sy;
    } else {
      this.position[1] = position[1];
    }

    const oldCenter = this.viewport.center;
    this.viewport.moveCenter(...this.position);

    const [x, y] = this.controller.getLocalMouse();
    this.controller.mouseMove(
      x + (this.viewport.center[0] - oldCenter[0]),
      y + (this.viewport.center[1] - oldCenter[1])
    );
  }

  setTarget(target: Spawnable, callback?: () => void) {
    if (this.highlightQueue.length > 0) {
      this.highlightQueue.splice(0, 1, { target, callback });
    } else {
      this.time = 0;
      this.target = target;
      this.callback = callback;
    }
  }

  highlight(target: Spawnable, callback?: () => void) {
    if (this.highlightQueue.length === 0) {
      if (this.target) {
        this.highlightQueue.push({ target: this.target });
      }

      this.time = 0;
      this.target = target;
      this.callback = callback;
    } else {
      this.highlightQueue.splice(1, 0, { target, callback });
    }
  }

  connect(controller: KeyboardController) {
    this.controller = controller;

    controller.addScrollListener((event) => {
      const zoomDelta =
        event.deltaY > 0
          ? Math.min(CameraTarget.maxZoomScale, event.deltaY)
          : Math.max(-CameraTarget.maxZoomScale, event.deltaY);
      const minScale = Math.max(
        this.viewport.screenHeight / this.viewport.worldHeight,
        this.viewport.screenWidth / this.viewport.worldWidth
      );
      this.scale = Math.min(
        CameraTarget.maxScale,
        Math.max(minScale, this.scale - zoomDelta * CameraTarget.zoomSpeed)
      );

      const oldWidth = this.viewport.width;
      this.viewport.setZoom(this.scale);

      const [x, y] = controller.getLocalMouse();
      const center = this.viewport.center;
      const dx = x - center[0];
      const dy = y - center[1];

      const delta = 1 - oldWidth / this.viewport.width;
      controller.mouseMove(x - dx * delta, y - dy * delta);

      const oldPosition = this.position;
      this.position = this.clamp(this.position);
      const dx2 = this.position[0] - oldPosition[0];
      const dy2 = this.position[1] - oldPosition[1];

      if (dx2 !== 0 || dy2 !== 0) {
        this.controller!.mouseMove(x + dx2, y + dy2);
        this.viewport.moveCenter(...this.position);
      }
    });
  }

  private clamp(position: [number, number]): [number, number] {
    return [
      Math.max(
        Math.min(
          position[0],
          this.viewport.worldWidth -
            (this.viewport.screenWidth + CameraTarget.horizontalMargin) /
              2 /
              this.scale
        ),
        (this.viewport.screenWidth + CameraTarget.horizontalMargin) /
          2 /
          this.scale
      ),
      Math.max(
        Math.min(
          position[1],
          this.viewport.worldHeight -
            (this.viewport.screenHeight - CameraTarget.verticalMargin) /
              2 /
              this.scale
        ),
        (this.viewport.screenHeight - CameraTarget.verticalMargin) /
          2 /
          this.scale
      ),
    ];
  }

  shake() {
    window.clearInterval(this.intervalId);

    const center = this.viewport.center;

    let shakes = CameraTarget.shakeAmount;
    this.intervalId = window.setInterval(() => {
      this.viewport.moveCenter(
        center[0] +
          Math.random() * CameraTarget.shakeIntensity -
          CameraTarget.shakeIntensity / 2,
        center[1] +
          Math.random() * CameraTarget.shakeIntensity -
          CameraTarget.shakeIntensity / 2
      );

      shakes--;
      if (shakes <= 0) {
        window.clearInterval(this.intervalId);
        this.intervalId = -1;
      }
    }, CameraTarget.shakeInterval);
  }
}
