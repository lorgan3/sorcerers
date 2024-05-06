import { PhysicsBody } from ".";
import { CollisionMask } from "./collisionMask";

const GRAVITY = 0.3;
const FRICTION = 1;
const BOUNCINESS = 0;
const MIN_MOVEMENT = 0.01;

interface Config {
  mask: CollisionMask;
  gravity?: number;
  friction?: number;
  bounciness?: number;
  onCollide?: (x: number, y: number, vx: number, vy: number) => void;
}

export class SimpleBody implements PhysicsBody {
  private xVelocity = 0;
  private yVelocity = 0;

  private x = 0;
  private y = 0;
  private rx = 0;
  private ry = 0;
  public gravity: number;
  public friction: number;
  public bounciness: number;
  private onCollide?: (x: number, y: number, vx: number, vy: number) => void;

  public readonly mask: CollisionMask;
  public active = 1;

  constructor(
    private surface: CollisionMask,
    {
      mask,
      gravity = GRAVITY,
      friction = FRICTION,
      bounciness = BOUNCINESS,
      onCollide,
    }: Config
  ) {
    this.mask = mask;
    this.gravity = gravity;
    this.friction = friction;
    this.bounciness = bounciness;
    this.onCollide = onCollide;
  }

  serialize() {
    return [this.x, this.y, this.xVelocity, this.yVelocity];
  }

  deserialize(data: any[]) {
    this.x = data[0];
    this.y = data[1];
    this.xVelocity = data[2];
    this.yVelocity = data[3];
  }

  addVelocity(x: number, y: number) {
    this.xVelocity += x;
    this.yVelocity += y;
    this.active = 1;
  }

  addAngularVelocity(power: number, direction: number) {
    this.xVelocity += Math.cos(direction) * power;
    this.yVelocity += Math.sin(direction) * power;
    this.active = 1;
  }

  setAngularVelocity(power: number, direction: number) {
    this.xVelocity = Math.cos(direction) * power;
    this.yVelocity = Math.sin(direction) * power;
    this.active = 1;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  tick(dt: number) {
    if (this.active === 0) {
      return false;
    }

    const idt = Math.pow(dt, 2) / 2;
    this.xVelocity *= Math.pow(this.friction, dt);
    this.yVelocity *= Math.pow(this.friction, dt);

    let yAcc = this.gravity;
    let yDiff = this.yVelocity * dt + yAcc * idt;
    let xDiff = this.xVelocity * dt;

    const alignX = xDiff > 0 ? Math.ceil : (x: number) => x | 0;
    const alignY = yDiff > 0 ? Math.ceil : (y: number) => y | 0;
    this.rx = alignX(this.x);
    this.ry = alignY(this.y);

    const vx = this.xVelocity;
    const vy = this.yVelocity;

    let xCollision: number | undefined;
    let yCollision: number | undefined;

    if (
      xDiff !== 0 &&
      this.surface.collidesWith(this.mask, alignX(this.x + xDiff), this.ry)
    ) {
      xCollision = alignX(this.x + xDiff);

      if (this.bounciness <= 0) {
        if (Math.abs(xDiff) >= 1) {
          const step = Math.sign(xDiff);
          while (
            !this.surface.collidesWith(
              this.mask,
              alignX(this.x + step),
              this.ry
            )
          ) {
            this.x += step;
          }
        }

        this.x = alignX(this.x);
        xDiff = 0;
      }

      this.xVelocity *= this.bounciness;
    }

    if (
      yDiff !== 0 &&
      this.surface.collidesWith(this.mask, this.rx, alignY(this.y + yDiff))
    ) {
      yCollision = alignY(this.y + yDiff);

      if (this.bounciness <= 0) {
        if (Math.abs(yDiff) >= 1) {
          const step = Math.sign(yDiff);
          while (
            !this.surface.collidesWith(
              this.mask,
              this.rx,
              alignY(this.y + step)
            )
          ) {
            this.y += step;
          }
        }

        this.y = alignY(this.y);
        yDiff = 0;
        yAcc = 0;
      }

      this.yVelocity *= this.bounciness;
    }

    this.x += xDiff;
    this.y += yDiff;
    this.yVelocity += yAcc * dt;

    if (
      (xCollision !== undefined || yCollision !== undefined) &&
      this.onCollide
    ) {
      this.onCollide(xCollision || this.rx, yCollision || this.ry, vx, vy);
    }

    // If we're on the ground and barely moving, go to sleep.
    if (
      (xCollision !== undefined || yCollision !== undefined) &&
      Math.abs(this.xVelocity) < MIN_MOVEMENT &&
      Math.abs(this.yVelocity) < MIN_MOVEMENT
    ) {
      this.xVelocity = 0;
      this.yVelocity = 0;
      this.active = 0;
    }

    return true;
  }

  get velocity() {
    return Math.sqrt(this.xVelocity ** 2 + this.yVelocity ** 2);
  }

  get direction() {
    return Math.atan2(this.yVelocity, this.xVelocity);
  }

  get precisePosition(): [number, number] {
    return [this.x, this.y];
  }

  get position(): [number, number] {
    return [this.rx, this.ry];
  }
}
