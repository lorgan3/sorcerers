import { Container } from "pixi.js";
import { ParticleEmitter } from "./types";

export class ParticleManager extends Container<ParticleEmitter> {
  addEmitter(particleEmitter: ParticleEmitter) {
    this.addChild(particleEmitter);
  }

  tick(dt: number) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const emitter = this.children[i];

      emitter.tick(dt);

      if (emitter.fading && emitter.activeParticles === 0) {
        this.removeChildAt(i);
      }
    }
  }

  destroyEmitter(particleEmitter?: ParticleEmitter, immediate?: boolean) {
    if (!particleEmitter) {
      return undefined;
    }

    if (immediate || particleEmitter.activeParticles === 0) {
      this.removeChild(particleEmitter);
      return undefined;
    }

    particleEmitter.fade();
    return undefined;
  }

  replaceEmitter(newEmitter: ParticleEmitter, oldEmitter?: ParticleEmitter) {
    this.destroyEmitter(oldEmitter, true);
    this.addEmitter(newEmitter);

    return newEmitter;
  }
}
