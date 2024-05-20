import {
  Application,
  BaseTexture,
  Container,
  DisplayObject,
  SCALE_MODES,
} from "pixi.js";
import { Terrain } from "./terrain";
import { CollisionMask } from "../collision/collisionMask";
import { Server } from "../network/server";
import { Map as GameMap } from ".";
import {
  HurtableEntity,
  Layer,
  Priority,
  Syncable,
  TickingEntity,
} from "../entity/types";
import { DamageNumberContainer } from "../../graphics/damageNumber";
import { DamageSource } from "../damage/types";
import { getId } from "../entity";
import { TurnState } from "../network/types";
import { ParticleManager } from "../../graphics/particles";
import { Character } from "../entity/character";
import { BloodEmitter } from "../../graphics/particles/bloodEmitter";
import { CameraTarget } from "../../graphics/cameraTarget";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { filters } from "@pixi/sound";
import { Viewport } from "./viewport";

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const SINK_PERCENT = 0.07;

export class Level {
  private app: Application<HTMLCanvasElement>;
  public readonly viewport: Viewport;
  public followedEntity: DisplayObject | null = null;

  private defaultLayer = new Container();
  public readonly numberContainer = new DamageNumberContainer();
  public readonly uiContainer = new Container();
  public readonly particleContainer = new ParticleManager();
  public readonly backgroundContainer = new Container();
  public readonly backgroundParticles = new ParticleManager();
  public readonly bloodEmitter = new BloodEmitter();
  public readonly cameraTarget: CameraTarget;

  private layers: Record<Layer, Container> = {
    [Layer.Background]: this.backgroundContainer,
    [Layer.Default]: this.defaultLayer,
  };

  public readonly terrain: Terrain;
  private spawnLocations: Array<[number, number]> = [];

  public readonly entities = new Set<TickingEntity>();
  public readonly entityMap = new Map<number, TickingEntity>();
  public readonly hurtables = new Set<HurtableEntity>();
  public readonly syncables: Record<Priority, Syncable[]> = {
    [Priority.Dynamic]: [],
    [Priority.Low]: [],
    [Priority.High]: [],
  };

  private deadCharacterQueue: Character[] = [];

  private static _instance: Level;
  static get instance() {
    return Level._instance;
  }

  constructor(private target: HTMLElement, map: GameMap) {
    Level._instance = this;

    this.app = new Application({
      resizeTo: window,
      background: "#fff",
    });
    window.addEventListener("resize", this.resize);

    target.appendChild(this.app.view);

    this.viewport = new Viewport(
      window.innerWidth,
      window.innerHeight,
      map.terrain.width * 6,
      map.terrain.height * 6
    );

    this.cameraTarget = new CameraTarget(this.viewport);
    this.app.stage.addChild(this.viewport, this.numberContainer);

    this.terrain = new Terrain(map);
    this.viewport.addChild(
      this.terrain.backgroundSprite,
      this.backgroundParticles,
      this.backgroundContainer,
      this.terrain.terrainSprite,
      this.defaultLayer,
      this.particleContainer,
      this.terrain.foreground,
      this.numberContainer,
      this.uiContainer
    );

    this.backgroundParticles.addEmitter(this.bloodEmitter);
  }

  private resize = () => {
    this.app.resize();
    this.viewport.resize(window.innerWidth, window.innerHeight);
  };

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
    this.cameraTarget.tick(dt);
    this.numberContainer.tick(dt);
    this.terrain.killbox.tick(dt);
    this.particleContainer.tick(dt);
    this.backgroundParticles.tick(dt);

    if (Server.instance) {
      for (let entity of this.hurtables) {
        if (entity.hp <= 0) {
          if (entity instanceof Character) {
            if (!this.deadCharacterQueue.includes(entity)) {
              if (entity === Server.instance.getActiveCharacter()) {
                Server.instance.clearActiveCharacter();
              }

              //@todo: keep track of the last damage dealer instead
              if (entity.hp < -500) {
                Server.instance.kill(entity);
              } else {
                this.deadCharacterQueue.push(entity);
              }
            }
            continue;
          }

          Server.instance.kill(entity);
        }
      }
    }

    for (let entity of this.entities) {
      entity.tick(dt);
    }
  }

  add(
    ...objects: Array<TickingEntity | HurtableEntity | Syncable | DisplayObject>
  ) {
    for (let object of objects) {
      if ("layer" in object) {
        this.layers[object.layer!].addChild(object);
      } else {
        this.defaultLayer.addChild(object);
      }

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

      if ("priority" in object) {
        this.syncables[object.priority].push(object);
      }
    }
  }

  remove(
    ...objects: Array<TickingEntity | HurtableEntity | Syncable | DisplayObject>
  ) {
    for (let object of objects) {
      if ("layer" in object) {
        this.layers[object.layer!].removeChild(object);
      } else {
        this.defaultLayer.removeChild(object);
      }

      if ("tick" in object) {
        this.entities.delete(object);
      }

      if ("id" in object) {
        this.entityMap.delete(object.id);
      }

      if ("hp" in object) {
        this.hurtables.delete(object);
      }

      if ("priority" in object) {
        this.syncables[object.priority].splice(
          this.syncables[object.priority].indexOf(object),
          1
        );
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

  sink() {
    this.shake();
    new ControllableSound(Sound.Drain, new filters.StereoFilter(0), {});
    this.terrain.killbox.rise(this.terrain.height * SINK_PERCENT);

    return this.terrain.killbox.level;
  }

  shake() {
    this.cameraTarget.shake();
  }

  hasDeathQueue() {
    return this.deadCharacterQueue.length > 0;
  }

  performDeathQueue() {
    Server.instance.setTurnState(TurnState.Killing);
    const character = this.deadCharacterQueue[0];

    Server.instance.highlight(character, () => {
      Server.instance.kill(character);
      this.deadCharacterQueue.shift();

      if (this.hasDeathQueue()) {
        this.performDeathQueue();
      } else {
        Server.instance.setTurnState(TurnState.Ending);
      }
    });
  }

  getViewport() {
    const center = this.viewport.center;
    return {
      x: center[0],
      y: center[1],
      width: this.viewport.worldScreenWidth,
      height: this.viewport.worldScreenHeight,
      scale: this.viewport.scale.x,
    };
  }

  setBrowserCursorVisibility(show: boolean) {
    if (show) {
      this.target.classList.remove("render-target--no-pointer");
    } else {
      this.target.classList.add("render-target--no-pointer");
    }
  }
}
