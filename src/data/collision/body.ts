import { Level } from "../level";
import { CollisionMask } from "./collisionMask";

const GRAVITY = 0.3;
const AIR_CONTROL = 0.6;
const GROUND_FRICTION = 0.88;
const AIR_FRICTION = 0.9;
const MIN_MOVEMENT = 0.01;

const SPEED = 0.3;
const JUMP_STRENGTH = 4;

export class Body {
  private active = 1;

  private xVelocity = 0;
  private yVelocity = 0;

  public x = 0;
  public y = 0;

  private _grounded = false;
  private jumped = false;

  private mask: CollisionMask;

  constructor(private level: Level, width: number, height: number) {
    this.mask = CollisionMask.forRect(width, height);
  }

  serialize() {
    return [this.active, this.x, this.y, this.xVelocity, this.yVelocity];
  }

  deserialize(data: any[]) {
    this.active = data[0];
    this.x = data[1];
    this.y = data[2];
    this.xVelocity = data[3];
    this.yVelocity = data[4];
  }

  walk(dt: number, direction: 1 | -1) {
    this.xVelocity +=
      SPEED * direction * (this._grounded ? 1 : AIR_CONTROL) * dt;
    this.active = 1;
  }

  jump() {
    if (this.jumped) {
      return;
    }

    this.yVelocity -= JUMP_STRENGTH;
    this.active = 1;
    this.jumped = true;
  }

  addVelocity(x: number, y: number) {
    this.xVelocity += x;
    this.yVelocity += y;
    this.active = 1;
  }

  get grounded() {
    return this._grounded;
  }

  tick(dt: number) {
    if (!this.active) {
      return;
    }

    this._grounded = false;
    this.jumped = false;
    this.yVelocity += GRAVITY * dt;

    if (this.yVelocity > 0) {
      this._grounded = this.level.collidesWith(
        this.mask,
        this.x | 0,
        Math.ceil(this.y + this.yVelocity)
      );

      if (this._grounded) {
        this.yVelocity = 0;
        this.y = Math.ceil(this.y); // This isn't accurate but good enough™️

        this.xVelocity *= GROUND_FRICTION;
      } else {
        this.xVelocity *= AIR_FRICTION;
      }
    } else {
      const ceiled = this.level.collidesWith(
        this.mask,
        this.x | 0,
        (this.y | 0) - 1
      );

      if (ceiled) {
        this.yVelocity = 0;
        this.y = Math.ceil(this.y); // This isn't accurate but good enough™️
      }

      this.xVelocity *= AIR_FRICTION;
    }

    this.x += this.xVelocity * dt;
    this.y += this.yVelocity * dt;

    if (
      this.xVelocity !== 0 &&
      this.level.collidesWith(this.mask, Math.floor(this.x), Math.floor(this.y))
    ) {
      if (
        !this.level.collidesWith(
          this.mask,
          Math.floor(this.x),
          Math.floor(this.y) - 1
        )
      ) {
        this.y = Math.floor(this.y - 1); // Move up 1px slopes automatically.
        this._grounded = true;
      } else {
        this.x = Math.round(this.x) - this.xVelocity;
        this.xVelocity = 0;
      }
    }

    if (
      this._grounded &&
      Math.abs(this.xVelocity) < MIN_MOVEMENT &&
      Math.abs(this.yVelocity) < MIN_MOVEMENT
    ) {
      this.xVelocity = 0;
      this.yVelocity = 0;
      this.active -= 0.2;
    }
  }
}
