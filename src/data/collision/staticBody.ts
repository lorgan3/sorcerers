import { PhysicsBody } from ".";
import { CollisionMask } from "./collisionMask";

interface Config {
  mask: CollisionMask;
}

export class StaticBody implements PhysicsBody {
  private x = 0;
  private y = 0;

  private rX = 0;
  private rY = 0;

  public moved = false;

  public readonly mask: CollisionMask;

  constructor(surface: CollisionMask, { mask }: Config) {
    this.mask = mask;
  }

  serialize() {
    return [this.x, this.y];
  }

  deserialize(data: any[]) {
    this.move(data[0], data[1]);
  }

  addVelocity(x: number, y: number) {
    // Static body does not move.
  }

  addAngularVelocity(power: number, direction: number) {
    // Static body does not move.
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
    const _rX = Math.round(this.x);
    const _rY = Math.round(this.y);

    if (_rX !== this.rX || _rY !== this.rY) {
      this.moved = true;
      this.rX = _rX;
      this.rY = _rY;
    }
  }

  tick(dt: number) {
    // Static body does not tick.

    return false;
  }

  get velocity() {
    return 0;
  }

  get direction() {
    return 0;
  }

  get position(): [number, number] {
    return [this.rX, this.rY];
  }

  get precisePosition(): [number, number] {
    return [this.x, this.y];
  }
}
