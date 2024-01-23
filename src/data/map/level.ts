import {
  Application,
  BaseTexture,
  Container,
  DisplayObject,
  SCALE_MODES,
} from "pixi.js";
import { Terrain } from "./terrain";
import { CollisionMask } from "../collision/collisionMask";
import { Viewport } from "pixi-viewport";
import { Server } from "../network/server";
import { Map as GameMap } from ".";
import { Manager } from "../network/manager";
import {
  HurtableEntity,
  Priority,
  Syncable,
  TickingEntity,
  isSyncableEntity,
} from "../entity/types";
import { DamageNumberContainer } from "../../graphics/damageNumber";
import { DamageSource } from "../damage/types";
import { getId } from "../entity";
import { TurnState } from "../network/types";
import { ParticleManager } from "../../graphics/particles";
import { KeyboardController } from "../controller/keyboardController";

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const SINK_AMOUNT = 20;
const SHAKE_AMOUNT = 10;
const SHAKE_INTENSITY = 12;
const SHAKE_INTERVAL = 25;

export class Level {
  private app: Application<HTMLCanvasElement>;
  public readonly viewport: Viewport;
  private followedEntity: DisplayObject | null = null;
  private followTime = 0;
  private intervalId = -1;

  private defaultLayer = new Container();
  public readonly damageNumberContainer = new DamageNumberContainer();
  public readonly uiContainer = new Container();
  public readonly particleContainer = new ParticleManager();

  public readonly terrain: Terrain;
  private spawnLocations: Array<[number, number]> = [];

  public readonly entities = new Set<TickingEntity>();
  public readonly entityMap = new Map<number, TickingEntity>();
  public readonly hurtables = new Set<HurtableEntity>();
  public readonly syncables: Syncable[] = [];

  private static _instance: Level;
  static get instance() {
    return Level._instance;
  }

  constructor(target: HTMLElement, map: GameMap) {
    Level._instance = this;

    this.app = new Application({
      resizeTo: window,
    });

    target.appendChild(this.app.view);

    let lastX: number | null = null;
    let lastY: number | null = null;

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
      .wheel({})
      .on("moved", () => {
        if (lastX) {
          const controller = Manager.instance.self
            .controller as KeyboardController;
          const [x, y] = controller.getLocalMouse();
          controller.mouseMove(
            x + lastX! - this.viewport.x,
            y + lastY! - this.viewport.y
          );
        }

        lastX = this.viewport.x;
        lastY = this.viewport.y;
      });

    this.app.stage.addChild(this.viewport, this.damageNumberContainer);

    this.terrain = new Terrain(map);
    this.viewport.addChild(
      this.terrain.container,
      this.defaultLayer,
      this.particleContainer,
      this.terrain.foreground,
      this.damageNumberContainer,
      this.uiContainer
    );

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (!event.repeat && event.key === "c") {
        Manager.instance.clearFollowTarget();
        this.mouseEdges();
      }
    });
    window.addEventListener("keyup", (event: KeyboardEvent) => {
      if (event.key === "c") {
        this.viewport.plugins.remove("mouse-edges");
      }
    });
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
    this.damageNumberContainer.tick(dt);
    this.terrain.killbox.tick(dt);
    this.particleContainer.tick(dt);

    if (Server.instance) {
      for (let entity of this.hurtables) {
        if (entity.hp <= 0) {
          if (entity === Server.instance.getActiveCharacter()) {
            Server.instance.clearActiveCharacter();
          }

          Server.instance.kill(entity);
        }
      }
    }

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

  add(
    ...objects: Array<TickingEntity | HurtableEntity | Syncable | DisplayObject>
  ) {
    this.defaultLayer.addChild(...objects);

    for (let object of objects) {
      if ("tick" in object) {
        this.entities.add(object);
      }

      if ("id" in object) {
        object.id = getId();
        this.entityMap.set(object.id, object);
      }

      if ("hp" in object) {
        this.hurtables.add(object);
      }

      if ("priority" in object && object.priority === Priority.Low) {
        this.syncables.push(object);
      }
    }
  }

  remove(
    ...objects: Array<TickingEntity | HurtableEntity | Syncable | DisplayObject>
  ) {
    this.defaultLayer.removeChild(...objects);

    for (let object of objects) {
      if ("tick" in object) {
        this.entities.delete(object);
      }

      if ("id" in object) {
        this.entityMap.delete(object.id);
      }

      if ("hp" in object) {
        this.hurtables.delete(object);
      }

      if ("priority" in object && object.priority === Priority.Low) {
        this.syncables.splice(this.syncables.indexOf(object), 1);
      }
    }
  }

  damage(damageSource: DamageSource) {
    if (!Server.instance) {
      return;
    }

    if (
      damageSource
        .getTargets()
        .getEntities()
        .includes(Server.instance.getActiveCharacter()!)
    ) {
      Server.instance.setTurnState(TurnState.Ending);
    }

    damageSource.damage();
    Server.instance.syncDamage(damageSource);
  }

  withNearbyEntities(
    x: number,
    y: number,
    range: number,
    fn: (entity: HurtableEntity, distance: number) => void | boolean
  ) {
    const rangeSquared = range ** 2;
    for (let entity of this.hurtables) {
      const [ex, ey] = entity.getCenter();
      const distance = (ex - x) ** 2 + (ey - y) ** 2;
      if (distance < rangeSquared) {
        if (fn(entity, Math.sqrt(distance))) {
          return;
        }
      }
    }
  }

  follow(target: DisplayObject) {
    this.followTime = 30;

    if (this.followedEntity === target || this.intervalId !== -1) {
      return;
    }

    this.followedEntity = target;
    this.viewport.plugins.remove("mouse-edges");
    this.viewport.follow(target, {
      speed: 24,
      radius: 100,
    });
  }

  sink() {
    this.shake();

    this.terrain.killbox.rise(SINK_AMOUNT);
    // this.viewport.worldHeight -= SINK_AMOUNT * 6;
  }

  shake() {
    this.unfollow();
    window.clearInterval(this.intervalId);

    const center = this.viewport.center;

    let shakes = SHAKE_AMOUNT;
    this.intervalId = window.setInterval(() => {
      this.viewport!.animate({
        time: SHAKE_INTERVAL,
        position: {
          x: center.x + Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2,
          y: center.y + Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2,
        },
      });

      shakes--;
      if (shakes <= 0) {
        window.clearInterval(this.intervalId);
        this.intervalId = -1;
      }
    }, SHAKE_INTERVAL);
  }

  private unfollow() {
    this.followedEntity = null;
    this.viewport.plugins.remove("follow");
  }

  private mouseEdges() {
    this.unfollow();
    this.viewport.mouseEdges({
      radius: 100,
      speed: 12,
      allowButtons: true,
    });
  }
}
