import { Container } from "pixi.js";
import { Particle } from "./particle";
import { ParticleEmitter } from "./types";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { EntityType, HurtableEntity } from "../../data/entity/types";
import { DamageSource } from "../../data/damage/types";
import { Level } from "../../data/map/level";

const TINT_MAP: Partial<Record<EntityType, number>> = {
  [EntityType.Character]: 0xb91e1e,
  [EntityType.Shield]: 0x0690ce,
};

export class BloodEmitter
  extends Container<Particle>
  implements ParticleEmitter
{
  fading = false;
  activeParticles = 0;

  constructor() {
    super();

    for (let i = 0; i < 40; i++) {
      this.createParticle();
    }
  }

  private createParticle() {
    const frames =
      AssetsContainer.instance.assets!["atlas"].animations["elf_blood"];
    const particle = new Particle([
      frames[Math.floor(Math.random() * frames.length)],
    ]);
    particle.visible = false;
    particle.anchor.set(0.5);
    this.addChild(particle);

    return particle;
  }

  tick(dt: number) {
    for (let particle of this.children) {
      if (!particle.visible) {
        continue;
      }

      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        this.activeParticles--;
        particle.visible = false;
        particle.alpha = 1;
        continue;
      }

      particle.alpha = Math.min(1, particle.lifetime / 10);

      if (
        !Level.instance.terrain.collisionMask.collidesWithPoint(
          (particle.x / 6) | 0,
          (particle.y / 6) | 0
        )
      ) {
        particle.yVelocity += 0.25 * dt;

        particle.x += particle.xVelocity * dt;
        particle.y += particle.yVelocity * dt;
      }
    }
  }

  fade() {
    this.fading = true;
  }

  spawn(
    x: number,
    y: number,
    xVelocity: number,
    yVelocity: number,
    tint = 0xb91e1e
  ) {
    this.activeParticles++;
    let particle: Particle | undefined;

    for (let p of this.children) {
      if (!p.visible) {
        p.visible = true;
        particle = p;
        break;
      }
    }

    if (!particle) {
      particle = this.createParticle();
    }

    particle.x = x;
    particle.y = y;
    particle.xVelocity = xVelocity;
    particle.yVelocity = yVelocity;
    particle.tint = tint;

    particle.lifetime = 30 * (1 + 0.2 * Math.random());
  }

  burst(entity: HurtableEntity, damage: number, source?: DamageSource) {
    const [cx, cy] = entity.getCenter();

    const direction =
      source?.x !== undefined ? Math.atan2(source.y! - cy, source.x! - cx) : 0;
    const variance = source?.x !== undefined ? Math.PI / 12 : Math.PI * 2;

    const amount = Math.ceil(Math.sqrt(damage) * 3);
    for (let i = 0; i < amount; i++) {
      const speed = 5 + Math.random() * 4;
      this.spawn(
        cx + (Math.random() - 0.5) * 48,
        cy + (Math.random() - 0.5) * 48,
        Math.cos(direction + (Math.random() - 0.5) * variance) * speed,
        Math.sin(direction + (Math.random() - 0.5) * variance) * speed,
        TINT_MAP[entity.type]
      );
    }
  }
}
