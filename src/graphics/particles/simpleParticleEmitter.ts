import { ColorSource, Container, Texture } from "pixi.js";
import { Particle } from "./particle";
import { ParticleEmitter } from "./types";

interface Config {
  lifeTime: number;
  lifeTimeVariance: number;
  spawnFrequency: number;
  spawnRange: number;
  animate: boolean;
  fade: boolean;
  xAcceleration?: number;
  yAcceleration?: number;
  tint?: ColorSource;
  initialize: () => {
    x: number;
    y: number;
    xVelocity?: number;
    yVelocity?: number;
    frame?: number;
    scale?: number;
    alpha?: number;
  };
  pool: number;
}

export class SimpleParticleEmitter
  extends Container<Particle>
  implements ParticleEmitter
{
  static defaultConfig = {
    lifeTime: 30,
    lifeTimeVariance: 0.2,
    spawnFrequency: 0.5,
    spawnRange: 32,
    animate: true,
    fade: false,
    pool: 40,
  } satisfies Partial<Config>;

  private radius: number;

  fading = false;
  activeParticles = 0;

  constructor(textures: Texture[], private config: Config) {
    super();
    this.radius = config.spawnRange / 2;

    for (let i = 0; i < config.pool; i++) {
      const particle = new Particle(textures);
      particle.visible = false;
      particle.anchor.set(0.5);

      if (config.tint) {
        particle.tint = config.tint;
      }

      this.addChild(particle);
    }
  }

  tick(dt: number) {
    if (!this.fading && this.config.spawnFrequency > Math.random()) {
      this.spawn();
    }

    for (let particle of this.children) {
      if (!particle.visible) {
        continue;
      }

      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        this.activeParticles--;
        particle.visible = false;
        continue;
      }

      if (this.config.xAcceleration) {
        particle.xVelocity *= this.config.xAcceleration;
      }

      if (this.config.yAcceleration) {
        particle.yVelocity *= this.config.yAcceleration;
      }

      particle.x += particle.xVelocity * dt;
      particle.y += particle.yVelocity * dt;

      if (this.config.animate) {
        particle.currentFrame =
          ((1 - particle.lifetime / particle.maxLifetime) *
            (particle.totalFrames - 1)) |
          0;
      }

      if (this.config.fade) {
        particle.alpha = Math.min(
          particle.alpha,
          (particle.lifetime / particle.maxLifetime) * 2 + 0.2
        );
      }
    }
  }

  fade() {
    this.fading = true;
  }

  spawn() {
    for (let particle of this.children) {
      if (!particle.visible) {
        this.activeParticles++;
        particle.visible = true;

        const config = this.config.initialize();
        particle.x =
          config.x + Math.random() * this.config.spawnRange - this.radius;
        particle.y =
          config.y + Math.random() * this.config.spawnRange - this.radius;

        particle.xVelocity = config.xVelocity ?? 0;
        particle.yVelocity = config.yVelocity ?? 0;
        particle.currentFrame = config.frame ?? 0;
        particle.scale.set(config.scale ?? 1);
        particle.alpha = config.alpha ?? 1;

        particle.maxLifetime =
          this.config.lifeTime *
          (1 + this.config.lifeTimeVariance * Math.random());
        particle.lifetime = particle.maxLifetime;

        return;
      }
    }
  }

  burst(count: number) {
    for (let i = 0; i < count; i++) {
      this.spawn();
    }
  }
}
