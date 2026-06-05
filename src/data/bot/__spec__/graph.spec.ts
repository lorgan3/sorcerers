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

describe("Graph.build killbox exclusion", () => {
  // Solid-free stub surface: probeX finds no floor (so the floor loop makes no
  // nodes) and every collision query is empty, letting us exercise just the
  // ladder-node placement against the killbox level.
  const emptySurface = {
    width: 200,
    height: 200,
    collidesWith: () => false,
    collidesWithPoint: () => false,
    collidesWithLine: () => false,
  };

  function buildWithLadder(killboxLevel: number, ladder: object): Node[] {
    const graph = Object.create(Graph.prototype) as Graph;
    Object.assign(graph as unknown as Record<string, unknown>, {
      surface: emptySurface,
      killboxLevel,
      terrain: { ladders: [ladder] },
      nodes: new Map<string, Node>(),
      closestNodeCache: new Map<string, Node>(),
    });
    graph.build();
    return graph.getNodes();
  }

  it("places no ladder node whose standing body would enter the killbox", () => {
    const killboxLevel = 100;
    // Single-column ladder (width ≤ RESOLUTION) descending past the killbox.
    // Ladder nodes step down by RESOLUTION (12) from top: 50, 62, 74, 86, 98.
    const nodes = buildWithLadder(killboxLevel, {
      top: 50,
      bottom: 130,
      left: 47,
      right: 55,
      width: 8,
      horizontalCenter: 50,
    });

    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      // Body lower edge sits CHARACTER_HEIGHT/2 below the node.
      expect(node.y + Graph.CHARACTER_HEIGHT / 2).toBeLessThanOrEqual(
        killboxLevel
      );
    }
    // The safe step (86 + 8 = 94 ≤ 100) survives; the lethal one (98 + 8 = 106)
    // is dropped.
    expect(nodes.some((n) => n.y === 86)).toBe(true);
    expect(nodes.some((n) => n.y === 98)).toBe(false);
  });
});
