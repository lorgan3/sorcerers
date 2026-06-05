import { getDistance, getSquareDistance } from "../../util/math";
import { CollisionMask } from "../collision/collisionMask";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { Terrain } from "../map/terrain";
import { probeX } from "../map/utils";
import { Edge, EdgeType } from "./edge";
import { Node, NodeType } from "./node";
import { MAX_JUMP_DISTANCE, jumpReaches } from "./physics";

interface EdgeWithCost {
  edge: Edge;
  cost: number;
}

export class Graph {
  // Conservative upper bounds on jump reach (Math.floor in physics). These cap
  // the candidate-pair search and the diagonal climb/ladder range; actual jump
  // reachability is gated by physics.jumpReaches (couples height and distance).
  public static JUMP_DISTANCE = MAX_JUMP_DISTANCE;
  public static DIAGONAL_DISTANCE = MAX_JUMP_DISTANCE + 4;

  public static CHARACTER_HEIGHT = 16;

  public static RESOLUTION = 12;

  // Max horizontal offset (px) for which a jump counts as "near-vertical": the
  // bot can rise almost straight up, so a diagonal that only nicks the ledge
  // corner can still be cleared. Beyond this a clipped line means blocked travel.
  public static MAX_VERTICAL_JUMP_DRIFT = 2;

  private static WALK_REACH = Graph.RESOLUTION + 1;
  private static MIN_FALL_DISTANCE = 6;

  private nodes = new Map<string, Node>();
  private surface: CollisionMask;
  private killboxLevel: number;
  private closestNodeCache = new Map<string, Node>();

  constructor(private terrain: Terrain) {
    this.surface = terrain.characterMask;
    // The killbox rises during the game but the graph is rebuilt every turn, so
    // this reflects the current level; nodes at or below it are lethal.
    this.killboxLevel = terrain.killbox.level;
  }

  build() {
    this.closestNodeCache.clear();
    this.placeFloorNodes();
    this.placeLadderNodes();
    this.connectNodes();
  }

  private placeFloorNodes() {
    for (let x = 0; x < this.surface.width - 6; x++) {
      let y = probeX(this.surface, x);

      while (y < this.surface.height && y < this.killboxLevel) {
        let offset = 0;

        const isEdge = this.checkEdge(x, y);
        const isCheckpoint = x % Graph.RESOLUTION === 0;

        if (!isEdge && isCheckpoint) {
          while (
            offset > -16 &&
            this.surface.collidesWith(rectangle6x16, x - 3, y - 16 + offset)
          ) {
            offset--;
          }

          if (offset <= -16) {
            y = probeX(this.surface, x, y);
            continue;
          }
        }

        if (isEdge || isCheckpoint) {
          this.createNode(
            x,
            y + offset - 8,
            isEdge ? NodeType.Edge : NodeType.Regular
          );
        }

        y = probeX(this.surface, x, y);
      }
    }
  }

  private placeLadderNodes() {
    for (const ladder of this.terrain.ladders) {
      const multi = ladder.width > Graph.RESOLUTION;
      let y = Math.floor(ladder.top);
      let top = true;
      while (y < ladder.bottom && y < this.killboxLevel) {
        if (multi) {
          for (let x = Math.floor(ladder.left); x < ladder.right; x++) {
            if (!this.surface.collidesWith(rectangle6x16, x, y)) {
              this.createNode(x, y, top ? NodeType.LadderTop : NodeType.Ladder);
              x += Graph.RESOLUTION;
            }
          }
        } else {
          let x = Math.round(ladder.horizontalCenter) - 3;
          for (let offset = 0; offset * 2 < ladder.width; offset++) {
            if (!this.surface.collidesWith(rectangle6x16, x - offset + 1, y)) {
              this.createNode(
                x - offset,
                y,
                top ? NodeType.LadderTop : NodeType.Ladder
              );

              break;
            } else if (
              !this.surface.collidesWith(rectangle6x16, x + offset + 1, y)
            ) {
              this.createNode(
                x + offset,
                y,
                top ? NodeType.LadderTop : NodeType.Ladder
              );

              break;
            }
          }
        }

        y += Graph.RESOLUTION;
        top = false;
      }
    }
  }

  private connectNodes() {
    const RESOLUTION = Graph.RESOLUTION;
    const K = Math.ceil(Graph.JUMP_DISTANCE / RESOLUTION);

    const bins = new Map<number, Node[]>();
    for (const node of this.nodes.values()) {
      const bin = Math.floor(node.x / RESOLUTION);
      let arr = bins.get(bin);
      if (!arr) {
        arr = [];
        bins.set(bin, arr);
      }
      arr.push(node);
    }

    // Sorted bins + forward-only cross-bin scan ensure each pair is visited once.
    const sortedBins = [...bins.keys()].sort((a, b) => a - b);
    for (const bin of sortedBins) {
      const here = bins.get(bin)!;
      for (let i = 0; i < here.length; i++) {
        for (let j = i + 1; j < here.length; j++) {
          this.tryConnect(here[i], here[j]);
        }
        for (let offset = 1; offset <= K; offset++) {
          const neighbours = bins.get(bin + offset);
          if (!neighbours) continue;
          for (const other of neighbours) {
            this.tryConnect(here[i], other);
          }
        }
      }
    }
  }

  private tryConnect(a: Node, b: Node) {
    let from = a;
    let to = b;

    const xDiff = Math.abs(to.x - from.x);
    if (xDiff > Graph.JUMP_DISTANCE) {
      return;
    }

    let yDiff = from.y - to.y;
    if (yDiff < 0) {
      yDiff = -yDiff;
      [from, to] = [to, from];
    }
    // `from` is now the lower node, `to` the upper.

    if (this.lineOfSightBlocked(from, to, xDiff, yDiff)) {
      return;
    }

    if (this.tryLadderMount(from, to, xDiff, yDiff)) {
      return;
    }

    const walkResult = this.tryWalkOrShortGap(from, to, xDiff, yDiff);
    if (walkResult === "connected" || walkResult === "rejected") {
      return;
    }

    const distance = getDistance(from.x, from.y, to.x, to.y);
    if (this.tryClimb(from, to, distance)) {
      return;
    }

    if (xDiff === 0) {
      return;
    }

    if (from.type === NodeType.Ladder && to.type === NodeType.Ladder) {
      return;
    }

    if (from.type === NodeType.Ladder) {
      [from, to] = [to, from];
    }

    this.tryJumpOrFall(from, to, xDiff, yDiff, distance);
  }

  // The straight line clips terrain. Only a genuine near-vertical jump survives:
  // a tiny horizontal offset, a jump that reaches the height, and a clear
  // vertical rise. Falls and wider diagonals stay rejected.
  private lineOfSightBlocked(
    from: Node,
    to: Node,
    xDiff: number,
    yDiff: number
  ) {
    if (!this.surface.collidesWithLine(from.x, from.y, to.x, to.y)) {
      return false;
    }
    return (
      xDiff > Graph.MAX_VERTICAL_JUMP_DRIFT ||
      !jumpReaches(xDiff, yDiff) ||
      this.surface.collidesWithLine(from.x, from.y, from.x, to.y)
    );
  }

  // A floor node just below a ladder can grab it and climb up. Tolerates an
  // Edge-typed floor and a step up to character height — the body overlaps the
  // ladder base. Upward only; LadderTop stays a walk target.
  private tryLadderMount(from: Node, to: Node, xDiff: number, yDiff: number) {
    if (
      to.type === NodeType.Ladder &&
      !from.isLadder() &&
      xDiff <= Graph.WALK_REACH &&
      yDiff <= Graph.CHARACTER_HEIGHT
    ) {
      to.connect(from, EdgeType.Walk);
      return true;
    }
    return false;
  }

  // "connected": a walk edge was added. "rejected": a long flat Regular/Regular
  // span (covered by the walk chain between checkpoints). "passthrough": fall
  // through to jump/fall logic (e.g. an Edge gap boundary).
  private tryWalkOrShortGap(
    from: Node,
    to: Node,
    xDiff: number,
    yDiff: number
  ): "connected" | "rejected" | "passthrough" {
    if (
      xDiff > 0 &&
      (from.type === NodeType.Regular || to.type === NodeType.Regular) &&
      Math.abs(yDiff) < Graph.WALK_REACH
    ) {
      if (xDiff <= Graph.WALK_REACH) {
        to.connect(from, EdgeType.Walk);
        return "connected";
      }
      if (from.type === NodeType.Regular && to.type === NodeType.Regular) {
        return "rejected";
      }
    }
    return "passthrough";
  }

  private tryClimb(from: Node, to: Node, distance: number) {
    if (from.type === NodeType.Ladder && to.isLadder()) {
      if (distance < Graph.DIAGONAL_DISTANCE) {
        to.connect(from, EdgeType.Climb);
      }
      return true;
    }
    return false;
  }

  private tryJumpOrFall(
    from: Node,
    to: Node,
    xDiff: number,
    yDiff: number,
    distance: number
  ) {
    if (
      (from.y > to.y || distance > Graph.MIN_FALL_DISTANCE) &&
      jumpReaches(xDiff, yDiff)
    ) {
      // The character can only jump from a surface, not the middle of a ladder
      // (sideways dismount only fires at ladder edges). LadderTop is exempt.
      if (from.type === NodeType.Ladder || to.type === NodeType.Ladder) {
        return;
      }
      to.connect(from, EdgeType.Jump);
    } else {
      if (to.type === NodeType.Ladder) {
        // Ladders should be climbed, not abused as fall targets. Reject falls
        // that go down off a ladder; allow only shallow drops onto a ladder.
        const ladderIsBelow = to.y > from.y;
        if (!ladderIsBelow) {
          return;
        }
        const dropSlope = (to.y - from.y) / Math.abs(from.x - to.x);
        if (dropSlope > 1) {
          return;
        }
      }

      to.connect(from, EdgeType.Fall);
    }
  }

  private checkEdge(x: number, y: number) {
    return this.checkGaps(x, y) || this.checkWalls(x, y);
  }

  // Check 3 pixels down
  private checkGap(x: number, y: number, direction: number) {
    return (
      !this.surface.collidesWithPoint(x + direction, y) &&
      !this.surface.collidesWithPoint(x + direction, y + 1) &&
      !this.surface.collidesWithPoint(x + direction, y + 2)
    );
  }

  private checkGaps(x: number, y: number) {
    return this.checkGap(x, y, -1) || this.checkGap(x, y, 1);
  }

  // Check 3 pixels up
  private checkWall(x: number, y: number, direction: number) {
    return (
      this.surface.collidesWithPoint(x + direction, y - 1) &&
      this.surface.collidesWithPoint(x + direction, y - 2) &&
      this.surface.collidesWithPoint(x + direction, y - 3)
    );
  }

  private checkWalls(x: number, y: number) {
    if (
      this.checkWall(x, y, -1) &&
      !this.surface.collidesWith(rectangle6x16, x, y - 16)
    ) {
      return true;
    }

    if (
      this.checkWall(x, y, 1) &&
      !this.surface.collidesWith(rectangle6x16, x - 6, y - 16)
    ) {
      return true;
    }
  }

  private createNode(x: number, y: number, type: NodeType) {
    // Skip nodes whose body lower edge sits past the killbox — lethal on arrival.
    if (y + Graph.CHARACTER_HEIGHT / 2 > this.killboxLevel) {
      return undefined;
    }

    const node = new Node(x, y, type);
    this.nodes.set(node.toString(), node);
    return node;
  }

  getNode(x: number, y: number) {
    return this.nodes.get(Node.createKey(x, y));
  }

  getNodes() {
    return [...this.nodes.values()];
  }

  getClosestNode(x: number, y: number) {
    // Round to integer so sub-pixel input perturbations hit the same cache
    // entry. The scan itself still uses the un-rounded inputs.
    const key = `${Math.round(x)},${Math.round(y)}`;
    const hit = this.closestNodeCache.get(key);
    if (hit) return hit;

    let closestNode: Node | null = null;
    let closestDistance = Infinity;

    this.nodes.forEach((node) => {
      const dist = getSquareDistance(x, y, node.x, node.y);
      if (dist < closestDistance) {
        closestNode = node;
        closestDistance = dist;
      }
    });

    this.closestNodeCache.set(key, closestNode!);
    return closestNode!;
  }

  findEdges(
    node: Node,
    options: { maxCost?: number; type: EdgeType; allowedTypes?: EdgeType[] }
  ) {
    const edges: Edge[] = [];
    const closedSet = new Set<Node>();
    const visitedEdges = new Set<Edge>();

    const queue: EdgeWithCost[] = [];
    for (const edge of node.edges) {
      if (visitedEdges.has(edge)) continue;
      visitedEdges.add(edge);
      queue.push({ edge, cost: 0 });
    }

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      closedSet.add(current.edge.to);

      if (current.edge.type === options.type) {
        edges.push(current.edge);
        continue;
      }

      if (
        options.allowedTypes &&
        !options.allowedTypes.includes(current.edge.type)
      ) {
        continue;
      }

      for (const edge of current.edge.to.edges) {
        if (closedSet.has(edge.to)) continue;
        if (visitedEdges.has(edge)) continue;

        const cost = current.cost + edge.cost;
        if (options.maxCost && cost > options.maxCost) {
          continue;
        }

        visitedEdges.add(edge);
        queue.push({ edge, cost });
      }
    }

    return edges;
  }
}
