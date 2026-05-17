import { describe, expect, it } from "vitest";
import { Node, NodeType } from "../node";
import { EdgeType } from "../edge";

describe("Node", () => {
  it("should get the direction to another node", () => {
    const node = new Node(0, 0, NodeType.Regular);
    const other = new Node(1, 0, NodeType.Regular);

    expect(node.getDirection(other)).toBe(-1);
    expect(other.getDirection(node)).toBe(1);
  });

  it("should get the left node", () => {
    const node = new Node(1, 0, NodeType.Regular);
    const other = new Node(0, 0, NodeType.Regular);
    node.connect(other, EdgeType.Walk);

    expect(node.getLeftNode()).toBe(other);
    expect(other.getLeftNode()).toBe(undefined);
  });

  it("should get the right node", () => {
    const node = new Node(0, 0, NodeType.Regular);
    const other = new Node(1, 0, NodeType.Regular);
    node.connect(other, EdgeType.Walk);

    expect(node.getRightNode()).toBe(other);
    expect(other.getRightNode()).toBe(undefined);
  });
});
