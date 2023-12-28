import { CollisionMask } from "./collisionMask";

export interface PhysicsBody {
  mask: CollisionMask;

  addVelocity(x: number, y: number): void;
  addAngularVelocity(power: number, direction: number): void;
  tick(dt: number): boolean;
}
