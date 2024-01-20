import { PhysicsBody } from ".";
import { CollisionMask } from "./collisionMask";

interface Config {
  mask: CollisionMask;
  gravity?: number;
  friction?: number;
  bounciness?: number;
  onCollide?: (x: number, y: number) => void;
}

export class StaticBody implements PhysicsBody {
  private x = 0;
  private y = 0;

  private rX = 0;
  private rY = 0;

  public readonly mask: CollisionMask;

  constructor(surface: CollisionMask, { mask }: Config) {
    this.mask = mask;
  }

  serialize() {
    return [this.x, this.y];
  }

  deserialize(data: any[]) {
    this.move(data[1], data[2]);
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
    this.rX = Math.round(this.x);
    this.rY = Math.round(this.y);
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
