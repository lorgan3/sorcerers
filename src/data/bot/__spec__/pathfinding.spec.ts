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

  it("finds a multi-hop path through a chain of connected nodes", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(12, 0, NodeType.Regular);
    const c = new Node(24, 0, NodeType.Regular);
    const d = new Node(36, 0, NodeType.Regular);
    a.connect(b, EdgeType.Walk);
    b.connect(c, EdgeType.Walk);
    c.connect(d, EdgeType.Walk);

    const result = Pathfinding.findPath(a, d);

    expect(result.success).toBe(true);
    expect(result.path).toHaveLength(3);
    expect(result.path![0].to).toBe(b);
    expect(result.path![1].to).toBe(c);
    expect(result.path![2].to).toBe(d);
  });

  it("inserts a back-and-forth preroll before a direction-reversing jump", () => {
    // Chain A → B → C, then a JUMP from C going LEFT to D. C also has a
    // walkable detour to E on its right. Reconstruction should insert
    // (C → E → C) before (C → D) so the bot builds run-up before the jump.
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(10, 0, NodeType.Regular);
    const c = new Node(20, 0, NodeType.Regular);
    const d = new Node(15, 0, NodeType.Regular);
    const e = new Node(25, 0, NodeType.Regular);

    a.connect(b, EdgeType.Walk);
    b.connect(c, EdgeType.Walk);
    c.connect(e, EdgeType.Walk);
    c.connect(d, EdgeType.Jump);

    const result = Pathfinding.findPath(a, d);

    expect(result.success).toBe(true);
    expect(result.path).toHaveLength(5);
    expect(result.path![0].from).toBe(a);
    expect(result.path![0].to).toBe(b);
    expect(result.path![1].to).toBe(c);
    // Preroll: detour to E and immediately back to C.
    expect(result.path![2].from).toBe(c);
    expect(result.path![2].to).toBe(e);
    expect(result.path![3].from).toBe(e);
    expect(result.path![3].to).toBe(c);
    // Final jump.
    expect(result.path![4].from).toBe(c);
    expect(result.path![4].to).toBe(d);
    expect(result.path![4].type).toBe(EdgeType.Jump);
  });
});
