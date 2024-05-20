import { AnimatedSprite } from "pixi.js";

export class Particle extends AnimatedSprite {
  public color = "";
  public lifetime = 0;
  public maxLifetime = 0;
  public xVelocity = 0;
  public yVelocity = 0;
}
