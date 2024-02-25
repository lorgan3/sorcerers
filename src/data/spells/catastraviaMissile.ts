import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";

import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { Explosion } from "../../graphics/explosion";
import { EntityType, Spawnable } from "../entity/types";
import { Server } from "../network/server";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { angleDiff, getAngle, getSquareDistance } from "../../util/math";

export class CatastraviaMissile extends Container implements Spawnable {
  private static growTime = 45;
  private static homeStartTime = CatastraviaMissile.growTime + 5;
  private static speed = 2;

  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private distance: number;
  private launched = false;
  private time = 0;

  private particles: SimpleParticleEmitter;

  public dead = false;
  public id = -1;
  public readonly type = EntityType.CatastraviaMissile;

  constructor(
    x: number,
    y: number,
    private direction: number,
    private targetX: number,
    private targetY: number
  ) {
    super();
    this.distance = getSquareDistance(x, y, targetX, targetY);

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: Server.instance ? this.onCollide : undefined,
      bounciness: 1,
      friction: 1,
      gravity: 0,
    });
    this.body.move(x, y);
    this.body.setAngularVelocity(CatastraviaMissile.speed, direction);

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.sprite = new AnimatedSprite(atlas.animations["spells_missile"]);
    this.sprite.animationSpeed = 0.3;
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(8, 8);
    this.sprite.loop = false;

    // const sprite2 = new Sprite(Texture.fromBuffer(circle3x3Canvas.data, 3, 3));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        lifeTime: 10,
        lifeTimeVariance: 1,
        spawnRange: 64,
        spawnFrequency: 0,
        tint: 0xf79a71,
        initialize: () => ({
          x: this.position.x,
          y: this.position.y,
        }),
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  private onCollide = (x: number, y: number) => {
    this._die(x, y);
  };

  private _die(x: number, y: number) {
    Level.instance.damage(new ExplosiveDamage(x, y, 12, 2, 1));
    Server.instance.kill(this);
  }

  die() {
    this.dead = true;
    Level.instance.remove(this);
    new Explosion(this.position.x, this.position.y);
    Level.instance.particleContainer.destroyEmitter(this.particles);
  }

  tick(dt: number) {
    this.time += dt;

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    if (Server.instance) {
      const newDistance = getSquareDistance(x, y, this.targetX, this.targetY);

      if (
        (newDistance > this.distance && this.distance < 500) ||
        this.distance < 100
      ) {
        this._die(x, y);
      } else {
        this.distance = newDistance;
      }
    }

    if (this.time > CatastraviaMissile.growTime) {
      if (!this.launched) {
        this.launched = true;
        ControllableSound.fromEntity([x * 6, y * 6], Sound.FireWork);
      }

      this.body.tick(dt);
    }

    if (this.time > CatastraviaMissile.homeStartTime) {
      this.particles.spawn();

      const angle = angleDiff(
        this.direction,
        getAngle(x, y, this.targetX, this.targetY)
      );

      const max = Math.max(0.05, (1 / this.distance) * 400) / 2;
      this.direction += Math.max(-max, Math.min(max, angle)) * dt;
      this.body.setAngularVelocity(CatastraviaMissile.speed, this.direction);
    }
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.direction,
      this.targetX,
      this.targetY,
    ] as const;
  }

  static create(data: ReturnType<CatastraviaMissile["serializeCreate"]>) {
    return new CatastraviaMissile(...data);
  }
}
