import {
  Application,
  Assets,
  BaseTexture,
  DisplayObject,
  SCALE_MODES,
  Sprite,
  Texture,
} from "pixi.js";
import { Terrain } from "./collision/terrain";
import { CollisionMask } from "./collision/collisionMask";
import { Viewport } from "pixi-viewport";

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

export class Level {
  private app: Application<HTMLCanvasElement>;
  private viewport?: Viewport;
  private terrain?: Terrain;
  private queue: DisplayObject[] = [];

  public activePlayer = 0;
  public host = false;

  private static _instance: Level;
  static get instance() {
    return Level._instance;
  }

  constructor(target: HTMLElement) {
    Level._instance = this;

    this.app = new Application({
      resizeTo: window,
    });

    target.appendChild(this.app.view);

    const asset = Assets.load(`${import.meta.env.BASE_URL}arena_well.png`);
    asset.then((asset) => {
      this.viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: asset.width * 6,
        worldHeight: asset.height * 6,
        events: this.app.renderer.events,
      })
        .clamp({
          direction: "all",
          underflow: "center",
        })
        .drag({ wheel: true, clampWheel: true, pressDrag: false })
        .pinch();

      this.app.stage.addChild(this.viewport);

      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;

      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 150, 600, 50);
      ctx.fillRect(50, 140, 50, 50);
      ctx.moveTo(100, 120);
      ctx.lineTo(50, 120);
      ctx.stroke();

      ctx.moveTo(100, 140);
      ctx.lineTo(130, 120);
      ctx.stroke();

      ctx.moveTo(180, 140);
      ctx.lineTo(100, 70);
      ctx.stroke();

      ctx.moveTo(50, 80);
      ctx.lineTo(50, 120);
      ctx.stroke();

      this.terrain = new Terrain(
        CollisionMask.fromAlpha(ctx.getImageData(0, 0, 600, 200)),
        asset
      );
      this.viewport.addChild(this.terrain);

      const texture = Texture.from(canvas);
      const sprite = new Sprite(texture);
      sprite.scale.set(6);
      this.viewport.addChild(sprite);

      if (this.queue.length > 0) {
        this.viewport.addChild(...this.queue);
        this.queue = [];
      }
    });
  }

  collidesWith(other: CollisionMask, dx: number, dy: number) {
    if (!this.terrain) {
      return false;
    }

    return this.terrain.collisionMask.collidesWith(other, dx, dy);
  }

  add(...objects: DisplayObject[]) {
    if (!this.viewport) {
      this.queue.push(...objects);
      return;
    }

    this.viewport.addChild(...objects);
  }

  remove(...objects: DisplayObject[]) {
    this.viewport!.removeChild(...objects);
  }
}
