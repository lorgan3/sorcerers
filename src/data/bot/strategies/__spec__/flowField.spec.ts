import { FlowField } from "../flowField";
import { CollisionMask } from "../../../collision/collisionMask";

function emptyMask(w: number, h: number): CollisionMask {
  const m = CollisionMask.forRect(w, h);
  m.subtract(CollisionMask.forRect(w, h), 0, 0);
  return m;
}

describe("FlowField", () => {
  it("routes straight toward the target in the open", () => {
    const mask = emptyMask(200, 200);
    const field = new FlowField(mask, [180, 100]);
    const wp = field.waypoint([20, 100], 24)!;
    expect(wp[0]).toBeGreaterThan(30);
    expect(Math.abs(wp[1] - 100)).toBeLessThanOrEqual(8);
  });

  it("routes over a wall between start and target", () => {
    const mask = emptyMask(200, 200);
    // Wall from the floor up to y=60, leaving clearance only above it.
    mask.add(CollisionMask.forRect(12, 140), 94, 60);
    const field = new FlowField(mask, [180, 180]);
    const wp = field.waypoint([20, 180], 24)!;
    // The route's first leg must climb, not head straight at the wall.
    expect(wp[1]).toBeLessThan(180);
  });

  it("returns null when the target is sealed off", () => {
    const mask = emptyMask(200, 200);
    // Solid block with a hollow center the missile cannot reach.
    mask.add(CollisionMask.forRect(60, 60), 70, 70);
    mask.subtract(CollisionMask.forRect(10, 10), 95, 95);
    const field = new FlowField(mask, [100, 100]);
    expect(field.waypoint([20, 20], 24)).toBeNull();
  });

  it("only builds and routes within the given bounds", () => {
    const mask = emptyMask(400, 200);
    const bounded = new FlowField(mask, [100, 100], [], 21, {
      left: 50,
      top: 50,
      right: 150,
      bottom: 150,
    });
    expect(bounded.waypoint([60, 100], 24)).not.toBeNull();
    // Far outside the region there is no field to follow.
    expect(bounded.waypoint([300, 100], 24)).toBeNull();
  });

  it("detours around hazard positions when a clear route exists", () => {
    const mask = emptyMask(300, 120);
    const direct = new FlowField(mask, [280, 60]);
    const hazardous = new FlowField(mask, [280, 60], [[150, 60]], 21);
    const directWp = direct.waypoint([150, 30], 12)!;
    const hazardWp = hazardous.waypoint([150, 30], 12)!;
    // With a hazard at (150,60), the route from above it should not descend
    // toward it the way the unconstrained route does.
    expect(hazardWp[1]).toBeLessThanOrEqual(directWp[1]);
  });
});
