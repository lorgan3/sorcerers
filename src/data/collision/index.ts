export interface PhysicsBody {
  addVelocity(x: number, y: number): void;
  addAngularVelocity(power: number, direction: number): void;
  tick(dt: number): boolean;
}
