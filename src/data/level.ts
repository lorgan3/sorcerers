import {
  Application,
  BaseTexture,
  DisplayObject,
  SCALE_MODES,
  Sprite,
} from "pixi.js";
import { Terrain } from "./collision/terrain";
import { CollisionMask } from "./collision/collisionMask";
import { Viewport } from "pixi-viewport";
import { AssetsContainer } from "../util/assets/assetsContainer";

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

interface TickingEntity extends DisplayObject {
  tick(dt: number): void;
}

interface HurtableEntity extends DisplayObject {
  hp: number;
}

export class Level {
  private app: Application<HTMLCanvasElement>;
  public readonly viewport: Viewport;
  public readonly terrain: Terrain;

  public activePlayer = 0;
  private entities = new Set<TickingEntity>();
  private hurtables = new Set<HurtableEntity>();

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

    const map = AssetsContainer.instance.assets!["map"];

    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: map.width * 6,
      worldHeight: map.height * 6,
      events: this.app.renderer.events,
    })
      .clamp({
        direction: "all",
        underflow: "center",
      })
      .drag({ wheel: true, clampWheel: true, pressDrag: false })
      .pinch();

    this.app.stage.addChild(this.viewport);

    const sky = AssetsContainer.instance.assets!["sky"];
    const sprite = new Sprite(sky);
    sprite.scale.set(6);
    this.viewport.addChild(sprite);

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 200;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 150, 600, 50);
    // ctx.fillRect(50, 140, 50, 50);
    // ctx.moveTo(100, 120);
    // ctx.lineTo(50, 120);
    // ctx.stroke();

    // ctx.moveTo(100, 140);
    // ctx.lineTo(130, 120);
    // ctx.stroke();

    // ctx.moveTo(180, 140);
    // ctx.lineTo(100, 70);
    // ctx.stroke();

    // ctx.moveTo(50, 80);
    // ctx.lineTo(50, 120);
    // ctx.stroke();

    this.terrain = new Terrain(
      CollisionMask.fromAlpha(ctx.getImageData(0, 0, 600, 200)),
      map
    );
    this.viewport.addChild(this.terrain);

    // const texture = Texture.from(canvas);
    // const sprite2 = new Sprite(texture);
    // sprite2.scale.set(6);
    // this.viewport.addChild(sprite2);
  }

  collidesWith(other: CollisionMask, dx: number, dy: number) {
    if (!this.terrain) {
      return false;
    }

    return this.terrain.collisionMask.collidesWith(other, dx, dy);
  }

  tick(dt: number) {
    for (let entity of this.entities) {
      entity.tick(dt);
    }
  }

  add(...objects: Array<TickingEntity | HurtableEntity | DisplayObject>) {
    this.viewport.addChild(...objects);

    for (let object of objects) {
      if ("tick" in object) {
        this.entities.add(object);
      }

      if ("hp" in object) {
        this.hurtables.add(object);
      }
    }
  }

  remove(...objects: Array<TickingEntity | HurtableEntity | DisplayObject>) {
    this.viewport!.removeChild(...objects);

    for (let object of objects) {
      if ("tick" in object) {
        this.entities.delete(object);
      }

      if ("hp" in object) {
        this.hurtables.delete(object);
      }
    }
  }

  hurt(x: number, y: number, range: number, damage: number) {
    const rangeSquared = range ** 2;
    for (let object of this.hurtables) {
      if ((object.x - x) ** 2 + (object.y - y) ** 2 < rangeSquared) {
        object.hp -= damage;
      }
    }
  }
}
