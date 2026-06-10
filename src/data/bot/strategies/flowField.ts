import { CollisionMask } from "../../collision/collisionMask";

// Game units per grid cell. Coarse enough to keep the field cheap, fine enough
// to route through 32-unit crawl spaces (two open rows at this size) and to
// never let an 8-unit floor slab slip between the clearance sample points.
const CELL = 8;
// Required free space (game units) around a cell center. Keeps routes off walls
// so the missile's turn lag doesn't clip corners the ray check would clear.
const CLEARANCE = 6;
const COST_STRAIGHT = 2;
const COST_DIAGONAL = 3;
// Extra cost for cells near a hazard (ally): routes prefer detours over passing
// right next to a friendly, where any terrain clip means friendly fire.
const HAZARD_COST = 12;

// Game-unit rectangle the field is built for. Routes cannot leave it, so pad it
// generously around the engagement — detours (over walls, around roofs) need room
// beyond the straight start→target box.
export interface FlowFieldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Distance field over the terrain, seeded at a target point: every open cell
 * knows its travel cost to the target, so a guided missile can follow the
 * downhill gradient through tunnels, around walls, and into overhangs — routes a
 * greedy line-of-sight steering can never find. Built only within `boundsGame`
 * (defaults to the whole map), so a cast on a large map samples just the
 * engagement area.
 */
export class FlowField {
  private cols: number;
  private rows: number;
  private minCol: number;
  private minRow: number;
  private open: Uint8Array;
  private dist: Int32Array;

  constructor(
    surface: CollisionMask,
    targetGame: [number, number],
    hazardsGame: [number, number][] = [],
    hazardRadiusGame = 21,
    boundsGame?: FlowFieldBounds,
  ) {
    const mapCols = Math.ceil(surface.width / CELL);
    const mapRows = Math.ceil(surface.height / CELL);
    this.minCol = boundsGame
      ? Math.min(Math.max(Math.floor(boundsGame.left / CELL), 0), mapCols - 1)
      : 0;
    this.minRow = boundsGame
      ? Math.min(Math.max(Math.floor(boundsGame.top / CELL), 0), mapRows - 1)
      : 0;
    const maxCol = boundsGame
      ? Math.min(Math.max(Math.ceil(boundsGame.right / CELL), this.minCol + 1), mapCols)
      : mapCols;
    const maxRow = boundsGame
      ? Math.min(Math.max(Math.ceil(boundsGame.bottom / CELL), this.minRow + 1), mapRows)
      : mapRows;
    this.cols = maxCol - this.minCol;
    this.rows = maxRow - this.minRow;
    const size = this.cols * this.rows;
    this.open = new Uint8Array(size);
    this.dist = new Int32Array(size).fill(-1);

    const maxX = surface.width - 1;
    const maxY = surface.height - 1;
    const solid = (x: number, y: number) =>
      surface.collidesWithPoint(
        Math.min(Math.max(x, 0), maxX),
        Math.min(Math.max(y, 0), maxY),
      );
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = (this.minCol + c) * CELL + CELL / 2;
        const cy = (this.minRow + r) * CELL + CELL / 2;
        this.open[r * this.cols + c] =
          !solid(cx, cy) &&
          !solid(cx - CLEARANCE, cy) &&
          !solid(cx + CLEARANCE, cy) &&
          !solid(cx, cy - CLEARANCE) &&
          !solid(cx, cy + CLEARANCE)
            ? 1
            : 0;
      }
    }

    const hazardCost = new Uint8Array(size);
    for (const [hx, hy] of hazardsGame) {
      const rad = Math.ceil(hazardRadiusGame / CELL);
      const hc = Math.floor(hx / CELL) - this.minCol;
      const hr = Math.floor(hy / CELL) - this.minRow;
      for (let r = hr - rad; r <= hr + rad; r++) {
        for (let c = hc - rad; c <= hc + rad; c++) {
          if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
          const d = Math.hypot(c - hc, r - hr);
          if (d <= rad) {
            hazardCost[r * this.cols + c] = Math.max(
              hazardCost[r * this.cols + c],
              Math.round(HAZARD_COST * (1 - d / rad)),
            );
          }
        }
      }
    }

    // Tight radius: a seed that snaps far from the target can land on the wrong
    // side of a wall, making a sealed-off target look reachable.
    const seed = this.nearestOpenCell(targetGame, 2);
    if (seed === null) return;

    // Dijkstra over the 8-connected grid; diagonals only when both orthogonal
    // neighbours are open, so routes can't squeeze through corners.
    // Packed (cost << 20) | index. Index gets 20 bits; cost must stay below 2^11
    // or the shift hits the sign bit and heap ordering breaks — routes long enough
    // to get near that are capped instead (≈1000 cells at COST_STRAIGHT).
    const MAX_COST = (1 << 11) - 1;
    const heap: number[] = [];
    const push = (cost: number, index: number) => {
      heap.push((cost << 20) | index);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent] <= heap[i]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let smallest = i;
          if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
          if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
          if (smallest === i) break;
          [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
          i = smallest;
        }
      }
      return top;
    };

    this.dist[seed] = 0;
    push(0, seed);
    while (heap.length) {
      const packed = pop();
      const cost = packed >> 20;
      const index = packed & 0xfffff;
      if (cost > this.dist[index]) continue;
      const c = index % this.cols;
      const r = (index / this.cols) | 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          const ni = nr * this.cols + nc;
          if (!this.open[ni]) continue;
          if (
            dr &&
            dc &&
            (!this.open[r * this.cols + nc] || !this.open[nr * this.cols + c])
          ) {
            continue;
          }
          const step = dr && dc ? COST_DIAGONAL : COST_STRAIGHT;
          const next = Math.min(cost + step + hazardCost[ni], MAX_COST);
          if (this.dist[ni] === -1 || next < this.dist[ni]) {
            this.dist[ni] = next;
            push(next, ni);
          }
        }
      }
    }
  }

  // Closest open cell to a point, searched in growing rings (the point itself is
  // often inside the clearance margin — e.g. a character standing on the ground).
  private nearestOpenCell(
    [x, y]: [number, number],
    maxRadius: number,
  ): number | null {
    const rawC = Math.floor(x / CELL) - this.minCol;
    const rawR = Math.floor(y / CELL) - this.minRow;
    // Points beyond the search ring's reach outside the built region have no
    // meaningful cell — snapping them to the region edge would fabricate a route.
    if (
      rawC < -maxRadius ||
      rawC >= this.cols + maxRadius ||
      rawR < -maxRadius ||
      rawR >= this.rows + maxRadius
    ) {
      return null;
    }
    const c0 = Math.min(Math.max(rawC, 0), this.cols - 1);
    const r0 = Math.min(Math.max(rawR, 0), this.rows - 1);
    for (let radius = 0; radius <= maxRadius; radius++) {
      let best: number | null = null;
      let bestD = Infinity;
      for (let r = r0 - radius; r <= r0 + radius; r++) {
        for (let c = c0 - radius; c <= c0 + radius; c++) {
          if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
          if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== radius) continue;
          if (!this.open[r * this.cols + c]) continue;
          const d = Math.hypot(c - c0, r - r0);
          if (d < bestD) {
            bestD = d;
            best = r * this.cols + c;
          }
        }
      }
      if (best !== null) return best;
    }
    return null;
  }

  /**
   * A steering waypoint roughly `aheadGame` units along the downhill route from
   * `fromGame` toward the target, or null when the field has no route there.
   */
  waypoint(
    fromGame: [number, number],
    aheadGame: number,
  ): [number, number] | null {
    // Wider radius than the seed: the missile often flies just inside the
    // clearance margin along a wall, and should still pick the route back up.
    const start = this.nearestOpenCell(fromGame, 4);
    if (start === null || this.dist[start] === -1) return null;

    let current = start;
    const steps = Math.max(1, Math.round(aheadGame / CELL));
    for (let i = 0; i < steps; i++) {
      const c = current % this.cols;
      const r = (current / this.cols) | 0;
      let best = current;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          const ni = nr * this.cols + nc;
          if (this.dist[ni] === -1) continue;
          // Same corner rule as the build phase: a diagonal neighbour can have a
          // lower cost via another path, but stepping to it directly would cut a
          // corner the missile can't fly.
          if (
            dr &&
            dc &&
            (!this.open[r * this.cols + nc] || !this.open[nr * this.cols + c])
          ) {
            continue;
          }
          if (this.dist[ni] < this.dist[best]) best = ni;
        }
      }
      if (best === current) break; // at the seed, or boxed in by the corner rule
      current = best;
    }

    return [
      (this.minCol + (current % this.cols)) * CELL + CELL / 2,
      (this.minRow + ((current / this.cols) | 0)) * CELL + CELL / 2,
    ];
  }
}
