import { PhysicsBody } from ".";
import { CollisionMask } from "./collisionMask";

const OFFSETS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

const GRAVITY = 0.3;
const FRICTION = 1;

interface Config {
  mask: CollisionMask;
  velocity: number;
  friction?: number;
  gravity?: number;
}

export class StickyBody implements PhysicsBody {
  private xVelocity = 0;
  private yVelocity = 0;

  private x = 0;
  private y = 0;
  private rx = 0;
  private ry = 0;

  public stickDirection = -1;

  public readonly mask: CollisionMask;
  private readonly stickyVelocity: number;
  public gravity: number;
  public friction: number;

  constructor(
    private surface: CollisionMask,
    { mask, velocity, friction = FRICTION, gravity = GRAVITY }: Config
  ) {
    this.mask = mask;
    this.stickyVelocity = velocity;
    this.friction = friction;
    this.gravity = gravity;
  }

  serialize() {
    return [
      this.stickDirection,
      this.xVelocity,
      this.yVelocity,
      this.x,
      this.y,
    ];
  }

  deserialize(data: any[]) {
    this.move(data[3], data[4]);
    this.stickDirection = data[0];
    this.xVelocity = data[1];
    this.yVelocity = data[2];
  }

  addVelocity(x: number, y: number) {
    this.xVelocity += x;
    this.yVelocity += y;
    this.stickDirection = -1;
  }

  addAngularVelocity(power: number, direction: number) {
    this.xVelocity += Math.cos(direction) * power;
    this.yVelocity += Math.sin(direction) * power;
    this.stickDirection = -1;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.rx = Math.round(this.x);
    this.ry = Math.round(this.y);
    this.stickDirection = -1;
  }

  tick(dt: number) {
    if (this.stickDirection === -1) {
      const idt = Math.pow(dt, 2) / 2;

      let yAcc = this.gravity;
      let yDiff = this.yVelocity * dt + yAcc * idt;
      let xDiff = this.xVelocity * dt;

      const alignX = xDiff > 0 ? Math.ceil : (x: number) => x | 0;
      const alignY = yDiff > 0 ? Math.ceil : (y: number) => y | 0;
      this.rx = alignX(this.x);
      this.ry = alignY(this.y);

      if (
        xDiff !== 0 &&
        this.surface.collidesWithPoint(alignX(this.x + xDiff), this.ry)
      ) {
        this.stickDirection = xDiff > 0 ? 0 : 2;
        for (let i = 0; i < Math.abs(xDiff); i++) {
          const _x = this.rx + Math.sign(xDiff);

          if (this.surface.collidesWithPoint(_x, this.ry)) {
            this.x = this.rx;
            break;
          }

          this.x = _x;
          this.rx = this.x;
        }

        this.y = this.ry;
        this.yVelocity = -this.stickyVelocity;
        this.xVelocity = 0;
        return true;
      }

      if (
        yDiff !== 0 &&
        this.surface.collidesWithPoint(this.rx, alignY(this.y + yDiff))
      ) {
        this.stickDirection = yDiff > 0 ? 1 : 3;
        for (let i = 0; i < Math.abs(yDiff); i++) {
          const _y = this.ry + Math.sign(yDiff);

          if (this.surface.collidesWithPoint(this.rx, _y)) {
            this.y = this.ry;
            break;
          }

          this.y = _y;
          this.ry = this.y;
        }

        this.x = this.rx;
        this.xVelocity = (Math.sign(this.xVelocity) || 1) * this.stickyVelocity;
        this.yVelocity = 0;
        return true;
      }

      this.x += xDiff;
      this.y += yDiff;
      this.yVelocity += yAcc * dt;

      return true;
    }

    let dist = Math.abs(this.xVelocity * dt + this.yVelocity * dt);
    while (dist > 0) {
      const alignX = this.xVelocity > 0 ? Math.ceil : (x: number) => x | 0;
      const alignY = this.yVelocity > 0 ? Math.ceil : (y: number) => y | 0;

      const newX =
        dist > 1
          ? this.x + Math.sign(this.xVelocity)
          : this.x + ((this.xVelocity * dt) % 1 || Math.sign(this.xVelocity));
      const newY =
        dist > 1
          ? this.y + Math.sign(this.yVelocity)
          : this.y + ((this.yVelocity * dt) % 1 || Math.sign(this.yVelocity));

      if (this.surface.collidesWithPoint(alignX(newX), alignY(newY))) {
        const newDirection = (this.stickDirection + 2) % 4;
        if (this.xVelocity > 0) {
          this.stickDirection = 0;
          this.x = this.rx;
        } else if (this.yVelocity > 0) {
          this.stickDirection = 1;
          this.y = this.ry;
        } else if (this.xVelocity < 0) {
          this.stickDirection = 2;
          this.x = this.rx;
        } else {
          this.stickDirection = 3;
          this.y = this.ry;
        }

        this.xVelocity = OFFSETS[newDirection][0] * this.stickyVelocity;
        this.yVelocity = OFFSETS[newDirection][1] * this.stickyVelocity;
        dist -= 1;
      } else {
        const [ox, oy] = OFFSETS[this.stickDirection];
        if (
          !this.surface.collidesWithPoint(alignX(newX + ox), alignY(newY + oy))
        ) {
          const oldDirection = this.stickDirection;
          dist -= 1;

          if (this.xVelocity > 0) {
            this.stickDirection = 2;
            this.x = alignX(newX);
            this.rx = this.x;
          } else if (this.yVelocity > 0) {
            this.stickDirection = 3;
            this.y = alignY(newY);
            this.ry = this.y;
          } else if (this.xVelocity < 0) {
            this.stickDirection = 0;
            this.x = alignX(newX);
            this.rx = this.x;
          } else {
            this.stickDirection = 1;
            this.y = alignY(newY);
            this.ry = this.y;
          }

          this.xVelocity = OFFSETS[oldDirection][0] * this.stickyVelocity;
          this.yVelocity = OFFSETS[oldDirection][1] * this.stickyVelocity;
        } else {
          this.x = newX;
          this.y = newY;
          this.rx = alignX(this.x);
          this.ry = alignY(this.y);
          dist -= Math.SQRT2;
        }
      }
    }

    return true;
  }

  get position(): [number, number] {
    return [this.rx, this.ry];
  }

  get precisePosition(): [number, number] {
    return [this.x, this.y];
  }

  get direction() {
    return Math.sign(this.xVelocity) || Math.sign(this.yVelocity);
  }

  get sticky() {
    return this.stickDirection != -1;
  }

  get velocity() {
    return Math.sqrt(this.xVelocity ** 2 + this.yVelocity ** 2);
  }
}
