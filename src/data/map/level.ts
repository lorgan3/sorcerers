import { Application, BaseTexture, DisplayObject, SCALE_MODES } from "pixi.js";
import { Terrain } from "./terrain";
import { CollisionMask } from "../collision/collisionMask";
import { Viewport } from "pixi-viewport";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Server } from "../network/server";
import { DamageSource } from "../damage";

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
  private followedEntity: DisplayObject | null = null;
  private followTime = 0;

  public readonly terrain: Terrain;
  private spawnLocations: Array<[number, number]> = [];

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

    const map = AssetsContainer.instance.assets!["playground"];
    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: map.terrain.width * 6,
      worldHeight: map.terrain.height * 6,
      events: this.app.renderer.events,
    })
      .clamp({
        direction: "all",
        underflow: "center",
      })
      .pinch()
      .wheel({});

    this.mouseEdges();

    this.app.stage.addChild(this.viewport);

    this.terrain = new Terrain(map);
    this.viewport.addChild(this.terrain);
  }

  getRandomSpawnLocation() {
    if (!this.spawnLocations.length) {
      this.spawnLocations = this.terrain.getSpawnLocations();
    }

    const index = Math.floor(Math.random() * this.spawnLocations.length);
    return this.spawnLocations.splice(index, 1)[0];
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

    if (this.followedEntity) {
      this.followTime -= dt;

      if (this.followTime <= 0) {
        this.unfollow();
      }
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

  damage(damageSource: DamageSource) {
    if (!Server.instance) {
      return;
    }

    Server.instance.syncDamage(damageSource);
    damageSource.damage();
  }

  withNearbyEntities(
    x: number,
    y: number,
    range: number,
    fn: (entity: HurtableEntity, distance: number) => void
  ) {
    const rangeSquared = range ** 2;
    for (let entity of this.hurtables) {
      const distance = (entity.x - x) ** 2 + (entity.y - y) ** 2;
      if (distance < rangeSquared) {
        fn(entity, Math.sqrt(distance));
      }
    }
  }

  follow(target: DisplayObject) {
    this.followTime = 30;

    if (this.followedEntity === target) {
      return;
    }

    this.followedEntity = target;
    this.viewport.plugins.remove("mouse-edges");
    this.viewport.follow(target, {
      speed: 24,
      radius: 100,
    });
  }

  private unfollow() {
    this.followedEntity = null;
    this.viewport.plugins.remove("follow");
    this.mouseEdges();
  }

  private mouseEdges() {
    this.viewport.mouseEdges({
      distance: 100,
      speed: 12,
    });
  }
}
