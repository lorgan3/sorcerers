import { describe, expect, it } from "vitest";
import { Node, NodeType } from "../node";
import { EdgeType } from "../edge";
import { Pathfinding } from "../pathfinding";

describe("Pathfinding", () => {
  it("returns an empty path when start equals goal", () => {
    const node = new Node(0, 0, NodeType.Regular);
    const result = Pathfinding.findPath(node, node);

    expect(result.success).toBe(true);
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBe(0);
  });

  it("finds a direct walk path across two connected nodes", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(12, 0, NodeType.Regular);
    a.connect(b, EdgeType.Walk);

    const result = Pathfinding.findPath(a, b);

    expect(result.success).toBe(true);
    expect(result.path).toHaveLength(1);
    expect(result.path![0].to).toBe(b);
  });

  it("returns failure when no path exists", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(100, 0, NodeType.Regular);
    // No edges connecting them

    const result = Pathfinding.findPath(a, b);

    expect(result.success).toBe(false);
    expect(result.path).toBeUndefined();
  });
});
