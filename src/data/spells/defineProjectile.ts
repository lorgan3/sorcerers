import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { CollisionMask } from "../collision/collisionMask";
import {
  EntityType,
  Priority,
  Spawnable,
  SpawnableFactory,
  Syncable,
} from "../entity/types";
import { TurnState } from "../network/types";
import { Element } from "./types";
import { Shape } from "../damage/fallDamage";
import { Sound } from "../../sound";
import { Character } from "../entity/character";
import { ParticleEmitter } from "../../graphics/particles/types";
import { Explosion } from "../../graphics/explosion";
import { AcidSplash } from "../../graphics/acidSplash";
import { IceImpact } from "../../graphics/iceImpact";
import { ControllableSound } from "../../sound/controllableSound";
import { getLevel, getManager, getServer } from "../context";
import {
  applyExplosiveDamage,
  applyImpactDamage,
  applyFallDamage,
  castProjectile,
  createParticles,
} from "./utils";

export interface ProjectileConfig {
  type: EntityType;
  priority?: Priority;

  body: {
    mask: CollisionMask;
    friction: number;
    gravity: number;
    bounciness?: number;
    bounces?: number;
  };

  sprite: {
    animation: string;
    animationSpeed: number;
    anchor: [number, number];
    scale?: number;
    alpha?: number;
    offset?: [number, number];
    rotateWithDirection?: boolean;
    randomStartFrame?: boolean;
  };

  particles?: {
    animation: string;
    config: Omit<
      Parameters<typeof createParticles>[1],
      "initialize"
    > & {
      initialize: (position: { x: number; y: number }) => {
        x: number;
        y: number;
        xVelocity?: number;
        yVelocity?: number;
        scale?: number;
        alpha?: number;
      };
    };
  };

  sound?: Sound;
  lifetime: number;

  damage: {
    type: "explosive" | "impact" | "fall";
    radius?: number;
    intensity?: number;
    shape?: Shape;
    base: number;
    element: Element;
    multiplier: number;
  };

  bounceDamage?: {
    type: "explosive";
    radius: number;
    intensity: number;
    base: number;
    element: Element;
    multiplier: number;
  };

  deathEffect:
    | "explosion"
    | "acidSplash"
    | "iceImpact"
    | { custom: (x: number, y: number, direction?: number) => void };

  deathSound?: Sound;
  turnState?: TurnState;

  cast: {
    speed: number | ((power: number) => number);
  };

  centerOffset?: [number, number];

  onTick?: (entity: ProjectileEntity, dt: number) => void;
  onCollide?: (
    entity: ProjectileEntity,
    x: number,
    y: number,
    vx: number,
    vy: number
  ) => boolean;
}

export interface ProjectileEntity extends Container, Syncable {
  readonly body: SimpleBody;
  readonly sprite: AnimatedSprite;
  readonly particles: ParticleEmitter | null;
}

export type ProjectileFactory = SpawnableFactory & {
  cast(...args: any[]): any;
};

export function defineProjectile(config: ProjectileConfig): ProjectileFactory {
  const configPriority = config.priority ?? Priority.Dynamic;
  const configTurnState = config.turnState ?? TurnState.Ending;
  const centerOffset = config.centerOffset ?? [0, 0];

  class ProjectileEntityImpl extends Container implements Syncable {
    public id = -1;
    public readonly type = config.type;
    public readonly priority = configPriority;
    public readonly body: SimpleBody;
    public readonly sprite: AnimatedSprite;
    public readonly particles: ParticleEmitter | null;

    private bounces = config.body.bounces ?? 0;
    private lifetime = config.lifetime;

    constructor(
      x: number,
      y: number,
      speed: number,
      direction: number,
      collisionMask: CollisionMask
    ) {
      super();

      this.body = new SimpleBody(collisionMask, {
        mask: config.body.mask,
        onCollide: getServer() ? this.onCollide : undefined,
        friction: config.body.friction,
        gravity: config.body.gravity,
        bounciness: config.body.bounciness,
      });
      this.body.move(x, y);
      this.body.addAngularVelocity(speed, direction);
      this.position.set(x * 6, y * 6);

      if (config.sound) {
        ControllableSound.fromEntity(this, config.sound);
      }

      const atlas = AssetsContainer.instance.assets!["atlas"];
      this.sprite = new AnimatedSprite(
        atlas.animations[config.sprite.animation]
      );
      this.sprite.animationSpeed = config.sprite.animationSpeed;
      this.sprite.play();
      this.sprite.anchor.set(...config.sprite.anchor);
      if (config.sprite.scale) this.sprite.scale.set(config.sprite.scale);
      if (config.sprite.alpha !== undefined)
        this.sprite.alpha = config.sprite.alpha;
      if (config.sprite.offset)
        this.sprite.position.set(...config.sprite.offset);
      if (config.sprite.rotateWithDirection) this.sprite.rotation = direction;
      if (config.sprite.randomStartFrame) {
        this.sprite.currentFrame = Math.floor(
          this.sprite.totalFrames * Math.random()
        );
      }
      this.addChild(this.sprite);

      if (config.particles) {
        const particleConfig = config.particles;
        this.particles = createParticles(particleConfig.animation, {
          ...particleConfig.config,
          initialize: () =>
            particleConfig.config.initialize({
              x: this.position.x,
              y: this.position.y,
            }),
        });
      } else {
        this.particles = null;
      }
    }

    private onCollide = (cx: number, cy: number, vx: number, vy: number) => {
      if (config.onCollide) {
        const suppress = config.onCollide(
          this as unknown as ProjectileEntity,
          cx,
          cy,
          vx,
          vy
        );
        if (suppress) return;
      }

      if (this.bounces > 0) {
        const playerCollision =
          !getLevel().terrain.collisionMask.collidesWith(
            this.body.mask,
            cx,
            cy
          );

        if (!playerCollision) {
          this.bounces--;
          if (config.bounceDamage) {
            applyExplosiveDamage(cx, cy, config.bounceDamage);
          }
          getServer()!.dynamicUpdate(this);
          return;
        }
      }

      this.applyDamageAndKill(cx, cy);
    };

    private applyDamageAndKill(dx: number, dy: number) {
      const dmg = config.damage;
      if (dmg.type === "explosive") {
        applyExplosiveDamage(dx, dy, {
          radius: dmg.radius!,
          intensity: dmg.intensity!,
          base: dmg.base,
          element: dmg.element,
          multiplier: dmg.multiplier,
        });
      } else if (dmg.type === "impact") {
        applyImpactDamage(dx, dy, this.sprite.rotation, {
          base: dmg.base,
          element: dmg.element,
          multiplier: dmg.multiplier,
        });
      } else if (dmg.type === "fall") {
        applyFallDamage(dx, dy, {
          shape: dmg.shape!,
          base: dmg.base,
          element: dmg.element,
          multiplier: dmg.multiplier,
        });
      }
      getServer()!.kill(this);
    }

    tick(dt: number) {
      this.body.tick(dt);
      const [bx, by] = this.body.precisePosition;
      this.position.set(bx * 6, by * 6);
      if (config.sprite.rotateWithDirection) {
        this.sprite.rotation = this.body.direction;
      }

      if (config.onTick) {
        config.onTick(this as unknown as ProjectileEntity, dt);
      }

      this.lifetime -= dt;
      if (this.lifetime <= 0 && getServer()) {
        this.applyDamageAndKill(bx, by);
      }
    }

    die() {
      getLevel().remove(this);
      if (this.particles) {
        getLevel().particleContainer.destroyEmitter(this.particles);
      }

      const effect = config.deathEffect;
      if (effect === "explosion") {
        new Explosion(this.position.x, this.position.y);
      } else if (effect === "acidSplash") {
        new AcidSplash(
          this.position.x + centerOffset[0],
          this.position.y + centerOffset[1]
        );
      } else if (effect === "iceImpact") {
        new IceImpact(this.position.x, this.position.y, this.sprite.rotation);
      } else {
        effect.custom(this.position.x, this.position.y, this.sprite.rotation);
      }

      if (config.deathSound) {
        ControllableSound.fromEntity(this, config.deathSound);
      }

      getManager().setTurnState(configTurnState);
    }

    getCenter(): [number, number] {
      return [
        this.position.x + centerOffset[0],
        this.position.y + centerOffset[1],
      ];
    }

    serialize() {
      return this.body.serialize();
    }

    deserialize(data: ReturnType<ProjectileEntityImpl["serialize"]>) {
      this.body.deserialize(data);
    }

    serializeCreate() {
      return [
        ...this.body.precisePosition,
        this.body.velocity,
        this.body.direction,
      ] as const;
    }
  }

  return {
    create(data: readonly [number, number, number, number]) {
      return new ProjectileEntityImpl(
        data[0],
        data[1],
        data[2],
        data[3],
        getLevel().terrain.characterMask
      );
    },

    cast(
      x: number,
      y: number,
      _character: Character,
      power: number,
      direction: number
    ) {
      const speed =
        typeof config.cast.speed === "function"
          ? config.cast.speed(power)
          : power * config.cast.speed;

      return castProjectile(
        (collisionMask) =>
          new ProjectileEntityImpl(x, y, speed, direction, collisionMask)
      );
    },
  };
}
