import { Container } from "pixi.js";

export interface ParticleEmitter extends Container {
  activeParticles: number;
  fading: boolean;

  tick(dt: number): void;
  fade(): void;
}
