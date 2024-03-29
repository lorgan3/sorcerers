import { Viewport } from "pixi-viewport";
import { KeyboardController } from "../data/controller/keyboardController";
import { Key } from "../data/controller/controller";
import { HurtableEntity, Spawnable } from "../data/entity/types";
import { getDistance } from "../util/math";
import { Manager } from "../data/network/manager";
import { Character } from "../data/entity/character";

export class CameraTarget {
  private static maxScale = 1.5;
  private static zoomSpeed = 0.01;
  private static maxZoomScale = 10;
  private static highlightDelay = 90;
  private static continueDelay = 120;

  private static maxSpeed = 50;
  private static damping = 40;
  private static dampingAmount = 0.96;
  private static maxAccDist = 600;
  private static minAccDist = 200;
  private static accDistMultiplier = 0.001;

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

  private attached = true;
  private oldMouse: [number, number] = [0, 0];
  private oldCDown = false;
  private followMouse = false;
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

    let position: [number, number] | undefined;

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

    if (this.target && this.attached) {
      position = this.target.getCenter();
    } else {
      if (
        this.target &&
        Manager.instance.self?.activeCharacter === this.target &&
        (this.target as Character).body.velocity !== 0
      ) {
        this.attached = true;
        this.speed = 0;
      }

      position = this.controller.getLocalMouse();
    }

    if (this.controller.isLocalKeyDown(Key.C)) {
      position = this.controller.getLocalMouse();

      if (!this.oldCDown) {
        this.oldCDown = true;
        this.oldMouse = position;
      }

      if (
        !this.followMouse &&
        getDistance(...position, ...this.oldMouse!) > 20
      ) {
        this.followMouse = true;
        this.attached = false;
        this.speed = 0;
      }
    } else if (this.oldCDown) {
      if (!this.followMouse) {
        this.attached = true;
        this.speed = 0;
      }

      this.followMouse = false;
      this.oldCDown = false;
    }

    // Clamp position to world edges
    position = [
      Math.round(
        Math.max(
          Math.min(
            position[0],
            this.viewport.worldWidth -
              this.viewport.screenWidth / 2 / this.scale
          ),
          this.viewport.screenWidth / 2 / this.scale
        )
      ),
      Math.round(
        Math.max(
          Math.min(
            position[1],
            this.viewport.worldHeight -
              this.viewport.screenHeight / 2 / this.scale
          ),
          this.viewport.screenHeight / 2 / this.scale
        )
      ),
    ];

    const dx = (position[0] - this.position[0]) * this.scale;
    const dy = (position[1] - this.position[1]) * this.scale;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    const speed = this.speed * dt;
    const sum = adx + ady;

    const sx = sum ? (speed * adx) / sum : 0;
    const sy = sum ? (speed * ady) / sum : 0;

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

    const [x, y] = this.controller.getLocalMouse();
    this.controller.mouseMove(
      x + (this.position[0] - this.viewport.center.x),
      y + (this.position[1] - this.viewport.center.y)
    );
    this.viewport.moveCenter(...this.position);

    if (
      (sx * CameraTarget.damping < adx || sy * CameraTarget.damping < ady) &&
      (this.attached || this.followMouse)
    ) {
      this.speed = Math.min(
        CameraTarget.maxSpeed,
        this.speed +
          Math.max(
            CameraTarget.minAccDist,
            Math.min(CameraTarget.maxAccDist, sum)
          ) *
            CameraTarget.accDistMultiplier *
            dt
      );
    } else if (this.speed !== 0) {
      this.speed *= Math.pow(CameraTarget.dampingAmount, dt);

      if (Math.abs(this.speed) < 1) {
        this.speed = 0;
      }
    }
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
      this.viewport.setZoom(this.scale, true);

      const [x, y] = controller.getLocalMouse();
      const center = this.viewport.center;
      const dx = x - center.x;
      const dy = y - center.y;

      const delta = 1 - oldWidth / this.viewport.width;
      controller.mouseMove(x - dx * delta, y - dy * delta);

      this.clamp();
    });
  }

  private clamp() {
    const oldPosition = [...this.position];

    this.position = [
      Math.max(
        Math.min(
          this.position[0],
          this.viewport.worldWidth - this.viewport.screenWidth / 2 / this.scale
        ),
        this.viewport.screenWidth / 2 / this.scale
      ),
      Math.max(
        Math.min(
          this.position[1],
          this.viewport.worldHeight -
            this.viewport.screenHeight / 2 / this.scale
        ),
        this.viewport.screenHeight / 2 / this.scale
      ),
    ];

    const dx = this.position[0] - oldPosition[0];
    const dy = this.position[1] - oldPosition[1];

    if (dx !== 0 || dy !== 0) {
      const [x, y] = this.controller!.getLocalMouse();
      this.controller!.mouseMove(x + dx, y + dy);
      this.viewport.moveCenter(...this.position);
    }
  }

  shake() {
    window.clearInterval(this.intervalId);

    const center = this.viewport.center;

    let shakes = CameraTarget.shakeAmount;
    this.intervalId = window.setInterval(() => {
      this.viewport!.animate({
        time: CameraTarget.shakeInterval,
        position: {
          x:
            center.x +
            Math.random() * CameraTarget.shakeIntensity -
            CameraTarget.shakeIntensity / 2,
          y:
            center.y +
            Math.random() * CameraTarget.shakeIntensity -
            CameraTarget.shakeIntensity / 2,
        },
      });

      shakes--;
      if (shakes <= 0) {
        window.clearInterval(this.intervalId);
        this.intervalId = -1;
      }
    }, CameraTarget.shakeInterval);
  }
}
