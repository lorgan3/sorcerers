import { CollisionMask } from "./collisionMask";

export interface PhysicsBody {
  readonly mask: CollisionMask;
  readonly position: [number, number];
  readonly precisePosition: [number, number];
  readonly velocity: number;
  readonly direction: number;

  move(x: number, y: number): void;
  addVelocity(x: number, y: number): void;
  addAngularVelocity(power: number, direction: number): void;
  tick(dt: number): boolean;
}
