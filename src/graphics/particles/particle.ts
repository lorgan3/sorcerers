import { AnimatedSprite } from "pixi.js";

export class Particle extends AnimatedSprite {
  public lifetime = 0;
  public xVelocity = 0;
  public yVelocity = 0;
}
