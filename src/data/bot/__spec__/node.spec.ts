import { describe, expect, it } from "vitest";
import { Node, NodeType } from "../node";

describe("Node", () => {
  it("should get the direction to another node", () => {
    const node = new Node(0, 0, NodeType.Regular);
    const other = new Node(1, 0, NodeType.Regular);

    expect(node.getDirection(other)).toBe(-1);
    expect(other.getDirection(node)).toBe(1);
  });
});
