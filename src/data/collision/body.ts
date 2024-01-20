import { PhysicsBody } from ".";
import { CollisionMask } from "./collisionMask";

// Random value that determines how much gravity a body must receive before something is considered a collision with the ground/ceiling
const COLLISION_TRIGGER = 7;

const GRAVITY = 0.2;
const AIR_CONTROL = 0.3;
const GROUND_FRICTION = 0.88;
const AIR_FRICTION = 0.98;
const MIN_MOVEMENT = 0.01;

const SPEED = 0.08;
const JUMP_STRENGTH = 3;

interface Config {
  mask: CollisionMask;
  gravity?: number;
  airFriction?: number;
  groundFriction?: number;
  airControl?: number;
  onCollide?: (x: number, y: number) => void;
  roundness?: number;
}

export class Body implements PhysicsBody {
  public active = 1;

  public xVelocity = 0;
  public yVelocity = 0;

  private x = 0;
  private y = 0;
  private rX = 0;
  private rY = 0;

  private _grounded = false;
  private jumped = false;

  public readonly mask: CollisionMask;
  private gravity: number;
  private airFriction: number;
  private groundFriction: number;
  private airControl: number;
  private onCollide?: (x: number, y: number) => void;
  private roundness: number;
  private lastRollDirection = 0;

  constructor(
    private surface: CollisionMask,
    {
      mask,
      gravity = GRAVITY,
      airFriction = AIR_FRICTION,
      groundFriction = GROUND_FRICTION,
      airControl = AIR_CONTROL,
      onCollide,
      roundness = 0,
    }: Config
  ) {
    this.mask = mask;
    this.gravity = gravity;
    this.airFriction = airFriction;
    this.groundFriction = groundFriction;
    this.airControl = airControl;
    this.onCollide = onCollide;
    this.roundness = roundness;
  }

  serialize() {
    return [this.active, this.xVelocity, this.yVelocity, this.x, this.y];
  }

  deserialize(data: any[]) {
    this.active = data[0];
    this.xVelocity = data[1];
    this.yVelocity = data[2];
    this.move(data[3], data[4]);
  }

  walk(dt: number, direction: 1 | -1) {
    const amount =
      SPEED * direction * (this._grounded ? 1 : this.airControl) * dt;
    this.addVelocity(amount, 0);
  }

  jump() {
    if (this.jumped) {
      return false;
    }

    this.yVelocity -= JUMP_STRENGTH;
    this.active = 1;
    this.jumped = true;
    return true;
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

  move(x: number, y: number) {
    this.x = x;
    this.y = y;

    const alignX = this.xVelocity > 0 ? Math.ceil : (x: number) => x | 0;
    const alignY = this.yVelocity > 0 ? Math.ceil : (y: number) => y | 0;
    this.rX = alignX(this.x);
    this.rY = alignY(this.y);
  }

  tick(dt: number) {
    if (this.active === 0) {
      return false;
    }

    this.yVelocity += this.gravity * dt;
    const alignX = this.xVelocity > 0 ? Math.ceil : (x: number) => x | 0;
    const alignY = this.yVelocity > 0 ? Math.ceil : (y: number) => y | 0;

    this.rX = alignX(this.x);
    this.rY = alignY(this.y);

    this._grounded = false;

    // We're stuck. Just push up and try again.
    if (this.surface.collidesWith(this.mask, this.rX, this.rY)) {
      this.x = alignX(this.x) - Math.sign(this.xVelocity);
    }

    // We're falling. Check if we've reached the ground yet.
    if (this.yVelocity > 0) {
      this._grounded = this.surface.collidesWith(
        this.mask,
        this.rX,
        alignY(this.y + this.yVelocity * dt)
      );

      if (this._grounded) {
        if (
          this.onCollide &&
          this.yVelocity > this.gravity * COLLISION_TRIGGER
        ) {
          this.onCollide(this.rX, this.rY);
        }

        // We hit the ground, align with it.
        while (this.yVelocity * dt > 1) {
          this.yVelocity /= 2;
          let v = this.yVelocity * dt;

          if (
            !this.surface.collidesWith(this.mask, this.rX, alignY(this.y + v))
          ) {
            this.y += v;
          }
        }

        this.yVelocity = 0;
        this.y = alignY(this.y);
        this.rY = this.y;

        // Roll off slopes.
        if (this.roundness) {
          if (!this.lastRollDirection) {
            if (
              !this.surface.collidesWith(this.mask, this.rX + 1, this.rY + 1)
            ) {
              this.lastRollDirection = 1;
              this.xVelocity += this.roundness * dt;
            } else if (
              !this.surface.collidesWith(this.mask, this.rX - 1, this.rY + 1)
            ) {
              this.lastRollDirection = -1;
              this.xVelocity -= this.roundness * dt;
            }
          } else if (
            !this.surface.collidesWith(
              this.mask,
              this.rX + this.lastRollDirection,
              this.rY + 1
            )
          ) {
            this.xVelocity += this.roundness * this.lastRollDirection * dt;
          }
        }

        this.xVelocity *= Math.pow(this.groundFriction, dt);
      } else {
        this.xVelocity *= Math.pow(this.airFriction, dt);
      }
    } else {
      // We're going up. Check if we hit a ceiling.
      this.lastRollDirection = 0;
      const ceiled = this.surface.collidesWith(
        this.mask,
        this.rX,
        alignY(this.y + this.yVelocity * dt)
      );

      if (ceiled) {
        if (
          this.onCollide &&
          this.yVelocity < -this.gravity * COLLISION_TRIGGER
        ) {
          this.onCollide(this.rX, this.rY);
        }

        this.yVelocity = 0;
        this.y = alignY(this.y); // This isn't accurate but good enough™️
        this.rY = this.y;
      }

      this.xVelocity *= Math.pow(this.airFriction, dt);
    }

    this.y += this.yVelocity * dt;
    this.rY = alignY(this.y);
    this.rX = alignX(this.x + this.xVelocity * dt);

    // Check if we're going to hit a wall
    if (
      this.xVelocity !== 0 &&
      this.surface.collidesWith(this.mask, this.rX, this.rY)
    ) {
      const amount = Math.min(2, Math.ceil(Math.abs(this.xVelocity)));

      // Check if we can walk up steps <= 45 degrees.
      if (!this.surface.collidesWith(this.mask, this.rX, this.rY - amount)) {
        this.y = this.rY - amount;

        this.rY = this.y;
        this.yVelocity = 0;
        this._grounded = true;
        this.xVelocity *= Math.pow(this.groundFriction, dt);
      } else {
        if (this.onCollide) {
          this.onCollide(this.rX, this.rY);
        }

        // We hit a wall, align with it.
        while (Math.abs(this.xVelocity * dt) > 1) {
          this.xVelocity /= 2;
          let v = this.xVelocity * dt;

          if (
            !this.surface.collidesWith(this.mask, alignX(this.x + v), this.rY)
          ) {
            this.x += v;
          }
        }

        this.x = alignX(this.x);
        this.xVelocity = 0;
      }
    }

    this.jumped = false;
    this.x += this.xVelocity * dt;
    this.rX = alignX(this.x);

    // If we're on the ground and barely moving, go to sleep.
    if (this._grounded && Math.abs(this.xVelocity) < MIN_MOVEMENT) {
      this.xVelocity = 0;
      this.yVelocity = 0;
      this.active = 0;
    }

    return true;
  }

  get position(): [number, number] {
    return [this.rX, this.rY];
  }

  get precisePosition(): [number, number] {
    return [this.x, this.y];
  }

  get grounded() {
    return this._grounded;
  }

  get velocity() {
    return Math.sqrt(this.xVelocity ** 2 + this.yVelocity ** 2);
  }

  get direction() {
    return Math.atan2(this.yVelocity, this.xVelocity);
  }
}
