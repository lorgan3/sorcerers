import { describe, expect, it } from "vitest";
import { Graph } from "../graph";
import { Node, NodeType } from "../node";

describe("Graph.getClosestNode", () => {
  // Bypass Graph's terrain-requiring constructor; we only exercise the
  // closest-node logic which depends solely on the internal `nodes` map
  // and `closestNodeCache`.
  function makeGraphWithNodes(nodes: Node[]): Graph {
    const graph = Object.create(Graph.prototype) as Graph;
    const nodeMap = new Map<string, Node>();
    for (const node of nodes) nodeMap.set(node.toString(), node);
    (graph as unknown as { nodes: Map<string, Node> }).nodes = nodeMap;
    (graph as unknown as { closestNodeCache: Map<string, Node> }).closestNodeCache =
      new Map();
    return graph;
  }

  it("returns the spatially closest node", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(50, 0, NodeType.Regular);
    const graph = makeGraphWithNodes([a, b]);

    expect(graph.getClosestNode(5, 0)).toBe(a);
    expect(graph.getClosestNode(45, 0)).toBe(b);
  });

  it("caches results so repeated calls don't rescan", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(50, 0, NodeType.Regular);
    const graph = makeGraphWithNodes([a, b]);
    const cache = (graph as unknown as { closestNodeCache: Map<string, Node> })
      .closestNodeCache;

    expect(cache.size).toBe(0);
    expect(graph.getClosestNode(5, 0)).toBe(a);
    expect(cache.size).toBe(1);
    expect(graph.getClosestNode(5, 0)).toBe(a);
    // No new cache entry; same key reused.
    expect(cache.size).toBe(1);
  });

  it("rounds float inputs to integer cache keys", () => {
    const a = new Node(0, 0, NodeType.Regular);
    const b = new Node(50, 0, NodeType.Regular);
    const graph = makeGraphWithNodes([a, b]);
    const cache = (graph as unknown as { closestNodeCache: Map<string, Node> })
      .closestNodeCache;

    expect(graph.getClosestNode(5.2, 0.4)).toBe(a);
    expect(graph.getClosestNode(5.1, 0.3)).toBe(a);
    // Both rounded to "5,0".
    expect(cache.size).toBe(1);
    expect(cache.get("5,0")).toBe(a);
  });
});
