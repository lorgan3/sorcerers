import { describe, expect, it } from "vitest";
import { Edge, EdgeType } from "../edge";
import { Node, NodeType } from "../node";

const node = (x: number, y: number) => new Node(x, y, NodeType.Regular);

// Mirrors the private cost tuning in edge.ts; kept as literals so a change there
// is a deliberate, test-breaking decision.
const JUMP_COST_FACTOR = 1.2;
const FALL_COST_FACTOR = 1.4;
const VERTICAL_JUMP_PENALTY = 50;

describe("Edge", () => {
  describe("geometry fields", () => {
    it("computes dx/dy/direction from the from→to delta", () => {
      const e = new Edge(node(10, 5), node(40, 25), EdgeType.Walk);
      expect(e.dx).toBe(30);
      expect(e.dy).toBe(20);
      expect(e.direction).toBe(1);
    });

    it("direction is -1 leftward and 0 for a vertical edge", () => {
      expect(new Edge(node(40, 0), node(10, 0), EdgeType.Walk).direction).toBe(
        -1
      );
      expect(new Edge(node(5, 0), node(5, 30), EdgeType.Climb).direction).toBe(
        0
      );
    });

    it("isSteep when the vertical delta exceeds the horizontal", () => {
      expect(new Edge(node(0, 0), node(4, 20), EdgeType.Jump).isSteep).toBe(
        true
      );
      expect(new Edge(node(0, 0), node(20, 4), EdgeType.Jump).isSteep).toBe(
        false
      );
    });

    it("isVertical only when dx is exactly zero", () => {
      expect(new Edge(node(5, 0), node(5, 30), EdgeType.Climb).isVertical).toBe(
        true
      );
      expect(new Edge(node(5, 0), node(6, 30), EdgeType.Climb).isVertical).toBe(
        false
      );
    });
  });

  describe("cost", () => {
    // 3-4-5 triangle → Euclidean distance 50.
    const DISTANCE = 50;

    it("walk and climb cost the raw Euclidean distance", () => {
      expect(new Edge(node(0, 0), node(30, 40), EdgeType.Walk).cost).toBeCloseTo(
        DISTANCE
      );
      expect(
        new Edge(node(0, 0), node(30, 40), EdgeType.Climb).cost
      ).toBeCloseTo(DISTANCE);
    });

    it("a wide jump costs distance × the jump factor", () => {
      // xDiff 30 ≥ NARROW_JUMP_XDIFF — no vertical penalty.
      expect(new Edge(node(0, 0), node(30, 40), EdgeType.Jump).cost).toBeCloseTo(
        DISTANCE * JUMP_COST_FACTOR
      );
    });

    it("a narrow jump adds a penalty inversely proportional to xDiff", () => {
      // xDiff 3 < NARROW_JUMP_XDIFF — near-vertical jumps are discouraged.
      const xDiff = 3;
      const distance = Math.hypot(xDiff, 40);
      expect(
        new Edge(node(0, 0), node(xDiff, 40), EdgeType.Jump).cost
      ).toBeCloseTo(distance * JUMP_COST_FACTOR + VERTICAL_JUMP_PENALTY / xDiff);
    });

    it("a fall within the height limit costs distance × the fall factor", () => {
      // |dy| 40 ≤ FALL_LIMIT_HEIGHT (72).
      expect(new Edge(node(0, 0), node(30, 40), EdgeType.Fall).cost).toBeCloseTo(
        DISTANCE * FALL_COST_FACTOR
      );
    });

    it("a fall past the height limit is heavily penalised", () => {
      // |dy| 80 > FALL_LIMIT_HEIGHT — effectively unreachable.
      const distance = Math.hypot(10, 80);
      expect(
        new Edge(node(0, 0), node(10, 80), EdgeType.Fall).cost
      ).toBeCloseTo(1000 + distance);
    });
  });
});
