import { Container, Texture } from "pixi.js";
import { Particle } from "./particle";
import { ParticleEmitter } from "./types";

interface Config {
  lifeTime: number;
  lifeTimeVariance: number;
  spawnFrequency: number;
  spawnRange: number;
  xVelocity: number;
  yVelocity: number;
  pool: number;
}

export class SimpleParticleEmitter
  extends Container<Particle>
  implements ParticleEmitter
{
  static defaultConfig: Config = {
    lifeTime: 30,
    lifeTimeVariance: 0.2,
    spawnFrequency: 0.5,
    spawnRange: 32,
    xVelocity: 0,
    yVelocity: 0,
    pool: 40,
  };

  private radius: number;
  private spawnX = 0;
  private spawnY = 0;

  fading = false;
  activeParticles = 0;

  constructor(textures: Texture[], private config: Config) {
    super();
    this.radius = config.spawnRange / 2;

    for (let i = 0; i < config.pool; i++) {
      const particle = new Particle(textures);
      particle.visible = false;
      particle.anchor.set(0.5);

      this.addChild(particle);
    }
  }

  setSpawnPosition(x: number, y: number) {
    this.spawnX = x;
    this.spawnY = y;
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

      particle.x += particle.xVelocity * dt;
      particle.y += particle.yVelocity * dt;

      particle.currentFrame =
        ((1 - particle.lifetime / this.config.lifeTime) *
          (particle.totalFrames - 1)) |
        0;
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

        particle.x =
          this.spawnX + Math.random() * this.config.spawnRange - this.radius;
        particle.y =
          this.spawnY + Math.random() * this.config.spawnRange - this.radius;

        particle.xVelocity = this.config.xVelocity;
        particle.yVelocity = this.config.yVelocity;
        particle.lifetime =
          this.config.lifeTime *
          (1 + this.config.lifeTimeVariance * Math.random());

        return;
      }
    }
  }
}
