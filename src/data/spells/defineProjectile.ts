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

export function defineProjectile(config: ProjectileConfig): SpawnableFactory {
  const priority = config.priority ?? Priority.Dynamic;
  const turnState = config.turnState ?? TurnState.Ending;
  const centerOffset = config.centerOffset ?? [0, 0];

  function createEntity(
    x: number,
    y: number,
    speed: number,
    direction: number,
    collisionMask: CollisionMask
  ): Spawnable & { body: SimpleBody } {
    const container = new Container() as Container & {
      id: number;
      type: EntityType;
      priority: Priority;
      body: SimpleBody;
      sprite: AnimatedSprite;
      particles: ParticleEmitter | null;
    };

    container.id = -1;
    (container as any).type = config.type;
    (container as any).priority = priority;

    // Track bounces
    let bounces = config.body.bounces ?? 0;
    let lifetime = config.lifetime;

    // Collision handler
    const onCollide = (cx: number, cy: number, vx: number, vy: number) => {
      if (config.onCollide) {
        const suppress = config.onCollide(
          container as unknown as ProjectileEntity,
          cx,
          cy,
          vx,
          vy
        );
        if (suppress) return;
      }

      if (bounces > 0) {
        // Check if this is a player collision (not terrain)
        const playerCollision =
          !getLevel().terrain.collisionMask.collidesWith(body.mask, cx, cy);

        if (!playerCollision) {
          bounces--;
          if (config.bounceDamage) {
            applyExplosiveDamage(cx, cy, config.bounceDamage);
          }
          getServer()!.dynamicUpdate(container as unknown as Syncable);
          return;
        }
        // Player collision — fall through to die
      }

      die(cx, cy);
    };

    // Body
    const body = new SimpleBody(collisionMask, {
      mask: config.body.mask,
      onCollide: getServer() ? onCollide : undefined,
      friction: config.body.friction,
      gravity: config.body.gravity,
      bounciness: config.body.bounciness,
    });
    body.move(x, y);
    body.addAngularVelocity(speed, direction);
    container.position.set(x * 6, y * 6);
    container.body = body;

    // Sound
    if (config.sound) {
      ControllableSound.fromEntity(
        [container.position.x, container.position.y],
        config.sound
      );
    }

    // Sprite
    const atlas = AssetsContainer.instance.assets!["atlas"];
    const sprite = new AnimatedSprite(atlas.animations[config.sprite.animation]);
    sprite.animationSpeed = config.sprite.animationSpeed;
    sprite.play();
    sprite.anchor.set(...config.sprite.anchor);
    if (config.sprite.scale) sprite.scale.set(config.sprite.scale);
    if (config.sprite.alpha !== undefined) sprite.alpha = config.sprite.alpha;
    if (config.sprite.offset) sprite.position.set(...config.sprite.offset);
    if (config.sprite.rotateWithDirection) sprite.rotation = direction;
    if (config.sprite.randomStartFrame) {
      sprite.currentFrame = Math.floor(sprite.totalFrames * Math.random());
    }
    container.addChild(sprite);
    container.sprite = sprite;

    // Particles
    let particles: ParticleEmitter | null = null;
    if (config.particles) {
      const particleConfig = config.particles;
      particles = createParticles(particleConfig.animation, {
        ...particleConfig.config,
        initialize: () =>
          particleConfig.config.initialize({
            x: container.position.x,
            y: container.position.y,
          }),
      });
    }
    container.particles = particles;

    // Death
    function die(dx: number, dy: number) {
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
        applyImpactDamage(dx, dy, sprite.rotation, {
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
      getServer()!.kill(container as unknown as Spawnable);
    }

    // Spawnable/Syncable methods
    (container as any).tick = (dt: number) => {
      body.tick(dt);
      const [bx, by] = body.precisePosition;
      container.position.set(bx * 6, by * 6);
      if (config.sprite.rotateWithDirection) {
        sprite.rotation = body.direction;
      }

      if (config.onTick) {
        config.onTick(container as unknown as ProjectileEntity, dt);
      }

      lifetime -= dt;
      if (lifetime <= 0 && getServer()) {
        die(bx, by);
      }
    };

    (container as any).die = () => {
      getLevel().remove(container);
      if (particles) {
        getLevel().particleContainer.destroyEmitter(particles);
      }

      const effect = config.deathEffect;
      if (effect === "explosion") {
        new Explosion(container.position.x, container.position.y);
      } else if (effect === "acidSplash") {
        new AcidSplash(
          container.position.x + centerOffset[0],
          container.position.y + centerOffset[1]
        );
      } else if (effect === "iceImpact") {
        new IceImpact(
          container.position.x,
          container.position.y,
          sprite.rotation
        );
      } else {
        effect.custom(
          container.position.x,
          container.position.y,
          sprite.rotation
        );
      }

      if (config.deathSound) {
        ControllableSound.fromEntity(
          [container.position.x, container.position.y],
          config.deathSound
        );
      }

      getManager().setTurnState(turnState);
    };

    (container as any).getCenter = (): [number, number] => [
      container.position.x + centerOffset[0],
      container.position.y + centerOffset[1],
    ];

    (container as any).serialize = () => body.serialize();

    (container as any).deserialize = (data: any) => body.deserialize(data);

    (container as any).serializeCreate = () =>
      [
        ...body.precisePosition,
        body.velocity,
        body.direction,
      ] as const;

    return container as unknown as Spawnable & { body: SimpleBody };
  }

  return {
    create(data: readonly [number, number, number, number]) {
      return createEntity(
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

      return castProjectile((collisionMask) =>
        createEntity(x, y, speed, direction, collisionMask)
      );
    },
  };
}
