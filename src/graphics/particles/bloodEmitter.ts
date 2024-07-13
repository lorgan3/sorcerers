import { Container } from "pixi.js";
import { Particle } from "./particle";
import { ParticleEmitter } from "./types";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { EntityType, Spawnable } from "../../data/entity/types";
import { DamageSource } from "../../data/damage/types";
import { Level } from "../../data/map/level";

const TINT_MAP: Partial<Record<EntityType, string>> = {
  [EntityType.Character]: "#b91e1e",
  [EntityType.Shield]: "#0690ce",
  [EntityType.Acid]: "#3fba24",
};

export class BloodEmitter
  extends Container<Particle>
  implements ParticleEmitter
{
  private static maxParticles = 1000;
  private static initialParticles = 100;

  fading = false;
  activeParticles = 0;

  constructor() {
    super();

    for (let i = 0; i < BloodEmitter.initialParticles; i++) {
      this.createParticle();
    }
  }

  private createParticle() {
    const frames =
      AssetsContainer.instance.assets!["atlas"].animations["gibs_blood"];
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
      } else {
        particle.lifetime = 0;
        Level.instance.terrain.draw(
          (ctx) => {
            ctx.fillStyle = particle.color;

            if (particle.xVelocity > 0) {
              ctx.fillRect(
                ((particle.x / 6) | 0) + 1,
                ((particle.y / 6) | 0) + 1,
                1,
                1
              );
            } else {
              ctx.fillRect((particle.x / 6) | 0, (particle.y / 6) | 0, 1, 1);
            }
          },
          () => {}
        );
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
    tint = "#b91e1e"
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
      if (this.children.length > BloodEmitter.maxParticles) {
        return;
      }

      particle = this.createParticle();
    }

    particle.x = x;
    particle.y = y;
    particle.xVelocity = xVelocity;
    particle.yVelocity = yVelocity;
    particle.tint = tint;
    particle.color = tint;

    particle.lifetime = 500 * (1 + 0.2 * Math.random());
  }

  burst(entity: Spawnable, damage: number, source?: DamageSource) {
    const [cx, cy] = entity.getCenter();

    const direction =
      source?.x !== undefined ? Math.atan2(source.y! - cy, source.x! - cx) : 0;
    const variance = source?.x !== undefined ? Math.PI / 12 : Math.PI * 2;

    const amount = Math.ceil(Math.sqrt(damage) * 6);
    for (let i = 0; i < amount; i++) {
      const speed = 4 + Math.random() * 3;
      const angle =
        Math.random() > 0.5
          ? direction + (Math.random() - 0.5) * variance
          : Math.random() * Math.PI * 2;

      this.spawn(
        cx + (Math.random() - 0.5) * 48,
        cy + (Math.random() - 0.5) * 48,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        TINT_MAP[entity.type]
      );
    }
  }
}
