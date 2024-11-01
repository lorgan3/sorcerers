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
const JUMP_STRENGTH = 3.3;
const JUMP_COOLDOWN = 15;
const JUMP_CHARGE_TIME = 5;
const LADDER_SPEED = 0.6;

interface Config {
  mask: CollisionMask;
  gravity?: number;
  airXFriction?: number;
  airYFriction?: number;
  groundFriction?: number;
  airControl?: number;
  ladderSpeed?: number;
  ladderTest?: (x: number, y: number) => boolean;
  onCollide?: (x: number, y: number) => void;
  roundness?: number;
  bounciness?: number;
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
  private jumpTimer = 0;
  private walkDirection = 0;

  public readonly mask: CollisionMask;
  public gravity: number;
  private airXFriction: number;
  private airYFriction: number;
  private groundFriction: number;
  private airControl: number;
  private onCollide?: (x: number, y: number) => void;
  private roundness: number;
  private lastRollDirection = 0;
  private bounciness = 0;
  private ladderSpeed: number;
  private _onLadder = false;
  private ladderDirection = 0;
  private ladderTest?: (x: number, y: number) => boolean;

  constructor(
    private surface: CollisionMask,
    {
      mask,
      gravity = GRAVITY,
      airXFriction = AIR_FRICTION,
      airYFriction = airXFriction,
      groundFriction = GROUND_FRICTION,
      airControl = AIR_CONTROL,
      ladderSpeed = LADDER_SPEED,
      ladderTest,
      onCollide,
      roundness = 0,
      bounciness = 0,
    }: Config
  ) {
    this.mask = mask;
    this.gravity = gravity;
    this.airXFriction = airXFriction;
    this.airYFriction = airYFriction;
    this.groundFriction = groundFriction;
    this.airControl = airControl;
    this.ladderSpeed = ladderSpeed;
    this.ladderTest = ladderTest;
    this.onCollide = onCollide;
    this.roundness = roundness;
    this.bounciness = bounciness;
  }

  serialize() {
    return [
      this.active,
      this.xVelocity,
      this.yVelocity,
      this.x,
      this.y,
      this._onLadder,
    ];
  }

  deserialize(data: any[]) {
    this.active = data[0];
    this.xVelocity = data[1];
    this.yVelocity = data[2];
    this.move(data[3], data[4]);
    this._onLadder = data[5];
  }

  walk(direction: 1 | -1) {
    this.walkDirection = direction;
  }

  jump() {
    if (this.jumpTimer > 0 || this.yVelocity < 0) {
      return false;
    }

    this.yVelocity -= JUMP_STRENGTH;
    this.active = 1;
    this.jumpTimer = JUMP_COOLDOWN;
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

  setLadderDirection(direction: 1 | 0 | -1) {
    this.ladderDirection = direction;

    if (direction) {
      this.active = 1;
    }
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;

    const alignX = this.xVelocity > 0 ? Math.ceil : (x: number) => x | 0;
    const alignY = this.yVelocity > 0 ? Math.ceil : (y: number) => y | 0;
    this.rX = alignX(this.x);
    this.rY = alignY(this.y);

    this._grounded = this.surface.collidesWith(this.mask, this.rX, this.rY + 1);
  }

  tick(dt: number) {
    if (this.active === 0) {
      return false;
    }

    const idt = Math.pow(dt, 2) / 2;
    if (this._grounded || this._onLadder) {
      this.xVelocity *= Math.pow(this.groundFriction, dt);
    } else {
      this.xVelocity *= Math.pow(this.airXFriction, dt);
      this.yVelocity *= Math.pow(this.airYFriction, dt);
    }

    let yAcc = this._onLadder ? 0 : this.gravity;
    let yDiff = this.yVelocity * dt + yAcc * idt;
    let xAcc =
      this.walkDirection * SPEED * (this._grounded ? 1 : this.airControl);

    if (
      this.lastRollDirection &&
      Math.abs(this.xVelocity) < 0.5 &&
      !this._onLadder
    ) {
      xAcc += this.lastRollDirection * this.roundness;
    }

    let xDiff = this.xVelocity * dt + xAcc * idt;
    this.walkDirection = 0;
    this.lastRollDirection = 0;

    const alignX = xDiff > 0 ? Math.ceil : (x: number) => x | 0;
    const alignY = yDiff > 0 ? Math.ceil : (y: number) => y | 0;

    this.rX = alignX(this.x);
    this.rY = alignY(this.y);

    this._grounded = false;
    this.jumpTimer -= dt;

    // We're falling. Check if we've reached the ground yet.
    if (yDiff > 0) {
      this._grounded = this.surface.collidesWith(
        this.mask,
        this.rX,
        alignY(this.y + yDiff)
      );

      if (this._grounded) {
        let yCopy = yDiff;

        // We hit the ground, align with it.
        while (yCopy * dt > 1) {
          yCopy /= 2;
          let v = yCopy * dt;

          if (
            !this.surface.collidesWith(this.mask, this.rX, alignY(this.y + v))
          ) {
            this.y += v;
          }
        }
        this.y = alignY(this.y);
        this.rY = this.y;
        this.unmountLadder();

        if (
          this.onCollide &&
          this.yVelocity > this.gravity * COLLISION_TRIGGER
        ) {
          this.onCollide(this.rX, this.rY);
        }

        this.yVelocity *= this.bounciness;
        yAcc *= this.bounciness;
        yDiff *= this.bounciness;

        // Roll off slopes.
        if (this.roundness && yDiff > -0.5 && !this._onLadder) {
          if (!this.surface.collidesWith(this.mask, this.rX + 1, this.rY + 1)) {
            this.lastRollDirection = 1;
          } else if (
            !this.surface.collidesWith(this.mask, this.rX - 1, this.rY + 1)
          ) {
            this.lastRollDirection = -1;
          }
        }
      } else if (this.yVelocity === 0 && this.ladderTest?.(this.x, this.y)) {
        this.mountLadder();
        yAcc = 0;
        yDiff = 0;
      }
    } else {
      if (this.jumpTimer > JUMP_CHARGE_TIME) {
        this.jumpTimer -= dt;
      }

      // We're going up. Check if we hit a ceiling.
      const ceiled = this.surface.collidesWith(
        this.mask,
        this.rX,
        alignY(this.y + yDiff)
      );

      if (ceiled) {
        this.y = alignY(this.y); // This isn't accurate but good enough™️
        this.rY = this.y;

        if (
          this.onCollide &&
          this.yVelocity < -this.gravity * COLLISION_TRIGGER
        ) {
          this.onCollide(this.rX, this.rY);
        }

        this.yVelocity *= this.bounciness;
        yAcc *= this.bounciness;
        yDiff *= this.bounciness;
      }
    }

    this.y += yDiff;

    if (this._onLadder) {
      this.yVelocity = this.ladderDirection * this.ladderSpeed;
    } else {
      this.yVelocity += yAcc * dt;
    }

    this.rY = alignY(this.y);
    this.rX = alignX(this.x + xDiff);

    // Check if we're going to hit a wall
    if (xDiff !== 0 && this.surface.collidesWith(this.mask, this.rX, this.rY)) {
      const amount = Math.min(3, Math.ceil(Math.abs(xDiff)));

      // Check if we can walk up steps <= 45 degrees.
      if (
        this.yVelocity >= -amount &&
        !this.surface.collidesWith(this.mask, this.rX, this.rY - amount)
      ) {
        this.y = this.rY - amount;

        this.rY = this.y;
        this.yVelocity = 0;
        this._grounded = true;
      } else {
        let xCopy = xDiff;

        // We hit a wall, align with it.
        while (Math.abs(xCopy * dt) > 1) {
          xCopy /= 2;
          let v = xCopy * dt;

          if (
            !this.surface.collidesWith(this.mask, alignX(this.x + v), this.rY)
          ) {
            this.x += v;
          }
        }
        this.x = alignX(this.x);
        this.rX = this.x;

        if (this.onCollide) {
          this.onCollide(this.rX, this.rY);
        }

        this.xVelocity *= this.bounciness;
        xAcc *= this.bounciness;
        xDiff *= this.bounciness;
      }
    }

    this.x += xDiff;
    this.xVelocity += xAcc * dt;
    this.rX = alignX(this.x);

    // If we're on the ground and barely moving, go to sleep.
    if (
      this._grounded &&
      this.jumpTimer <= 0 &&
      this.lastRollDirection === 0 &&
      Math.abs(this.xVelocity) < MIN_MOVEMENT &&
      Math.abs(this.yVelocity) < MIN_MOVEMENT
    ) {
      this.xVelocity = 0;
      this.yVelocity = 0;
      this.active = 0;
    }

    return true;
  }

  mountLadder() {
    if (this.ladderSpeed === 0) {
      return;
    }

    this._onLadder = true;
    this.yVelocity = 0;
  }

  unmountLadder() {
    this._onLadder = false;
    this.ladderDirection = 0;
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

  get onLadder() {
    return this._onLadder;
  }
}
