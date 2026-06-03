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
  // Use Math.floor for a conservative upper bound: don't let the graph generate
  // jumps that exceed what the body can actually clear. Jump reachability itself
  // is gated by physics.jumpReaches (couples height and distance); these caps
  // bound the candidate-pair search and the diagonal climb/ladder range.
  public static JUMP_DISTANCE = MAX_JUMP_DISTANCE;
  public static DIAGONAL_DISTANCE = MAX_JUMP_DISTANCE + 4;

  public static FALL_LIMIT = 60;
  public static CHARACTER_HEIGHT = 16;

  public static RESOLUTION = 12;

  // Max horizontal offset (px) for which a jump counts as "near-vertical": the
  // bot can withhold air-control and rise almost straight up, so the launch
  // column is a fair proxy for its travel path and a diagonal that only nicks
  // the ledge corner can still be cleared. Beyond this, the straight line is the
  // honest model and a clipped line means blocked travel.
  public static MAX_VERTICAL_JUMP_DRIFT = 2;

  private nodes = new Map<string, Node>();
  private surface: CollisionMask;
  private killboxLevel: number;
  private closestNodeCache = new Map<string, Node>();

  constructor(private terrain: Terrain) {
    this.surface = terrain.characterMask;
    // Nodes at or below the killbox level are useless — a character standing
    // there dies the moment it arrives. The killbox rises during the game but
    // the graph is rebuilt every turn, so this reflects the current level.
    this.killboxLevel = terrain.killbox.level;
  }

  build() {
    this.closestNodeCache.clear();
    for (let x = 0; x < this.surface.width - 6; x++) {
      let y = probeX(this.surface, x);

      // Check vertical rows
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

    this.connectNodes();
  }

  private connectNodes() {
    const RESOLUTION = Graph.RESOLUTION;
    const K = Math.ceil(Graph.JUMP_DISTANCE / RESOLUTION);

    // 1D x-bin all nodes.
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

    // Iterate bins in sorted order so cross-bin pairs are visited from low
    // to high — each pair appears exactly once (own bin via index ordering,
    // higher bins via forward-only scan).
    const sortedBins = [...bins.keys()].sort((a, b) => a - b);
    for (const bin of sortedBins) {
      const here = bins.get(bin)!;
      for (let i = 0; i < here.length; i++) {
        // Within-bin pairs (j > i so each pair visited once).
        for (let j = i + 1; j < here.length; j++) {
          this.tryConnect(here[i], here[j]);
        }
        // Cross-bin pairs to the next K bins.
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

    if (this.surface.collidesWithLine(from.x, from.y, to.x, to.y)) {
      // The straight line clips terrain. Only a genuine near-vertical jump
      // survives: the bot rises in its own column and clambers onto the ledge,
      // so the diagonal only nicks the ledge corner. Require a tiny horizontal
      // offset (launch column ≈ travel path), that the jump can actually reach
      // the height, and that the vertical rise itself is clear. Falls and wider
      // diagonals stay rejected — there the straight line is a fair proxy and a
      // clipped line means the bot would plough through terrain en route.
      if (
        xDiff > Graph.MAX_VERTICAL_JUMP_DRIFT ||
        !jumpReaches(xDiff, yDiff) ||
        this.surface.collidesWithLine(from.x, from.y, from.x, to.y)
      ) {
        return;
      }
    }

    // Ladder mount: a floor node just below a ladder can grab it and climb up.
    // Unlike a plain walk this tolerates an Edge-typed floor (not only Regular)
    // and a step up to the character's height — the body overlaps the ladder
    // base, so the bot pulls itself on rather than needing a flush step. Mounts
    // are upward only (`to` is the upper node); LadderTop stays a walk target.
    if (
      to.type === NodeType.Ladder &&
      !from.isLadder() &&
      xDiff <= Graph.RESOLUTION + 1 &&
      yDiff <= Graph.CHARACTER_HEIGHT
    ) {
      to.connect(from, EdgeType.Walk);
      return;
    }

    if (
      xDiff > 0 &&
      (from.type === NodeType.Regular || to.type === NodeType.Regular) &&
      Math.abs(yDiff) < Graph.RESOLUTION + 1
    ) {
      if (xDiff <= Graph.RESOLUTION + 1) {
        to.connect(from, EdgeType.Walk);
        return;
      }
      // Too far to walk. If both ends are interior (Regular) ground, a long
      // flat span is already covered by the walk chain between the intermediate
      // checkpoint nodes, so don't add a redundant jump. But if either end is an
      // Edge node, this is a gap boundary (a cliff edge facing another ledge at
      // the same height) — fall through to the jump logic so the bot can clear
      // it, instead of being forced into a fall-then-jump detour.
      if (from.type === NodeType.Regular && to.type === NodeType.Regular) {
        return;
      }
    }

    const distance = getDistance(from.x, from.y, to.x, to.y);
    if (from.type === NodeType.Ladder && to.isLadder()) {
      if (distance < Graph.DIAGONAL_DISTANCE) {
        to.connect(from, EdgeType.Climb);
      }
      return;
    }

    // Only reject perfectly-stacked nodes (dx 0): their jump cost is infinite
    // (50/xDiff) and they're degenerate. A 1px horizontal offset is a genuine
    // near-vertical jump — the bot can hop almost straight up onto a ledge — so
    // let it through to the jump logic, gated by jumpReaches on height.
    if (xDiff === 0) {
      return;
    }

    if (from.type === NodeType.Ladder && to.type === NodeType.Ladder) {
      return;
    }

    if (from.type === NodeType.Ladder) {
      [from, to] = [to, from];
    }

    if (
      (from.y > to.y || distance > 6) &&
      jumpReaches(xDiff, yDiff)
    ) {
      // The character can only jump from a surface, not from the middle of a
      // ladder (sideways dismount only fires at ladder.left/ladder.right edges
      // per characterMovement.ts). LadderTop is exempt: it's the floor the
      // character emerges onto at the top of the ladder.
      if (from.type === NodeType.Ladder || to.type === NodeType.Ladder) {
        return;
      }
      to.connect(from, EdgeType.Jump);
    } else {
      if (to.type === NodeType.Ladder) {
        // Ladders should be climbed, not abused as fall targets.
        // After the swap above, `to` can be either side:
        //   - upper ladder + lower non-ladder: a fall edge would go DOWN
        //     off the ladder. Reject — the bot should climb down instead.
        //   - lower ladder + upper non-ladder: a fall edge would land ON
        //     the ladder. Allow shallow drops only; steep diagonals are
        //     better handled by the ladder itself.
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
