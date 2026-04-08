import { areCompatible, Socket, type WfcTile } from "./tiles";

export interface SeedTile {
  x: number;
  y: number;
  tileId: string;
}

export interface WfcParams {
  width: number;
  height: number;
  tiles: WfcTile[];
  density: number;
  edges: { top: number; bottom: number; left: number; right: number };
  seed?: number;
  /** Pre-place specific tiles before solving. Matched by prefix (e.g. "solid" matches "solid" and "solid_r1"). */
  seeds?: SeedTile[];
}

export interface WfcResult {
  success: boolean;
  grid: WfcTile[][] | null;
}

type Direction = "top" | "right" | "bottom" | "left";

const OPPOSITE: Record<Direction, Direction> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const NEIGHBORS: Array<{ dx: number; dy: number; dir: Direction }> = [
  { dx: 0, dy: -1, dir: "top" },
  { dx: 1, dy: 0, dir: "right" },
  { dx: 0, dy: 1, dir: "bottom" },
  { dx: -1, dy: 0, dir: "left" },
];

// Simple seeded PRNG (mulberry32)
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeSolidRatios(tiles: WfcTile[]): Map<string, number> {
  const ratios = new Map<string, number>();
  for (const tile of tiles) {
    const solidCount = tile.pixels.flat().filter(Boolean).length;
    const totalPixels = tile.pixels.length * tile.pixels[0].length;
    ratios.set(tile.id, solidCount / totalPixels);
  }
  return ratios;
}

function cellDensity(
  x: number,
  y: number,
  width: number,
  height: number,
  globalDensity: number,
  edges: WfcParams["edges"]
): number {
  const halfW = width / 2;
  const halfH = height / 2;

  // Edge influence: 1 at the edge, 0 at center (linear)
  const topI = Math.max(0, 1 - y / halfH);
  const bottomI = Math.max(0, 1 - (height - 1 - y) / halfH);
  const leftI = Math.max(0, 1 - x / halfW);
  const rightI = Math.max(0, 1 - (width - 1 - x) / halfW);

  const totalEdge = topI + bottomI + leftI + rightI;

  if (totalEdge === 0) return globalDensity;

  // Weighted blend of edge densities
  const edgeDensity =
    (topI * edges.top + bottomI * edges.bottom + leftI * edges.left + rightI * edges.right) /
    totalEdge;

  // Global influence is what's left after edge influences (capped at 0)
  const globalI = Math.max(0, 1 - totalEdge);

  return globalI * globalDensity + (1 - globalI) * edgeDensity;
}


// Bonus multiplier when a tile's socket matches the neighbor's socket type
// (not just compatibility, but same socket on both sides — e.g. SOLID-SOLID)
const CONTINUITY_BONUS = 1.5;

// Soft multiplier for tiles matching a neighbor's forcedNeighbors preference
const FORCED_NEIGHBOR_BONUS = 100;

function matchesForcedId(tileId: string, allowedIds: string[]): boolean {
  return allowedIds.some(
    (id) => tileId === id || tileId.startsWith(id + "_r")
  );
}

function neighborBonus(
  tile: WfcTile,
  cx: number,
  cy: number,
  grid: Set<WfcTile>[][],
  width: number,
  height: number
): number {
  let bonus = 1;

  for (const { dx, dy, dir } of NEIGHBORS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

    const neighbor = grid[ny][nx];
    if (neighbor.size !== 1) continue; // Only consider collapsed neighbors

    const nTile = [...neighbor][0];
    const opposite = OPPOSITE[dir];
    const socket = tile.sockets[dir];
    // Only apply continuity bonus for SOLID/EMPTY, not HALF sockets
    // to prevent diagonal slope chains
    if (
      socket === nTile.sockets[opposite] &&
      (socket === Socket.SOLID || socket === Socket.EMPTY)
    ) {
      bonus *= CONTINUITY_BONUS;
    }

    // Soft forced neighbor (outward): if the collapsed neighbor prefers
    // specific tiles in our direction, boost/penalize accordingly
    const forcedFromNeighbor = nTile.forcedNeighbors?.[opposite];
    if (forcedFromNeighbor) {
      if (matchesForcedId(tile.id, forcedFromNeighbor)) {
        bonus *= FORCED_NEIGHBOR_BONUS;
      } else {
        bonus /= FORCED_NEIGHBOR_BONUS;
      }
    }

    // Soft forced neighbor (inward): if the candidate tile itself prefers
    // specific tiles in this direction, boost if the neighbor already matches
    const forcedFromTile = tile.forcedNeighbors?.[dir];
    if (forcedFromTile) {
      if (matchesForcedId(nTile.id, forcedFromTile)) {
        bonus *= FORCED_NEIGHBOR_BONUS;
      } else {
        bonus /= FORCED_NEIGHBOR_BONUS;
      }
    }
  }

  return bonus;
}

function pickWeighted(
  options: WfcTile[],
  density: number,
  solidRatios: Map<string, number>,
  cx: number,
  cy: number,
  grid: Set<WfcTile>[][],
  width: number,
  height: number,
  rng: () => number
): WfcTile {
  const weights: number[] = [];
  let total = 0;
  for (const tile of options) {
    const base =
      tile.weight * neighborBonus(tile, cx, cy, grid, width, height);
    // Apply density scaling after continuity bonus so it can compete
    const solidRatio = solidRatios.get(tile.id) ?? 0.5;
    const exponent = (density - 0.5) * 40 * (solidRatio - 0.5);
    const w = base * Math.max(0.01, Math.pow(2, exponent));
    weights.push(w);
    total += w;
  }
  let r = rng() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function applyEdgeConstraints(
  grid: Set<WfcTile>[][],
  tiles: WfcTile[],
  edges: WfcParams["edges"],
  width: number,
  height: number,
  rng: () => number
) {
  const constrain = (
    x: number,
    y: number,
    dir: Direction,
    edgeDensity: number
  ) => {
    const current = grid[y][x];
    let filtered: WfcTile[];

    if (edgeDensity >= 0.75) {
      // 75-100%: must be SOLID
      filtered = [...current].filter((t) => t.sockets[dir] === Socket.SOLID);
    } else if (edgeDensity <= 0.25) {
      // 0-25%: must be EMPTY
      filtered = [...current].filter((t) => t.sockets[dir] === Socket.EMPTY);
    } else {
      // 26-74%: no constraint
      return;
    }

    if (filtered.length > 0) {
      grid[y][x] = new Set(filtered);
    }
  };

  for (let x = 0; x < width; x++) {
    constrain(x, 0, "top", edges.top);
  }
  for (let x = 0; x < width; x++) {
    constrain(x, height - 1, "bottom", edges.bottom);
  }
  for (let y = 0; y < height; y++) {
    constrain(0, y, "left", edges.left);
  }
  for (let y = 0; y < height; y++) {
    constrain(width - 1, y, "right", edges.right);
  }
}

function propagate(
  grid: Set<WfcTile>[][],
  queue: Array<[number, number]>,
  width: number,
  height: number
): boolean {
  let qi = 0;
  while (qi < queue.length) {
    const [x, y] = queue[qi++];
    const cell = grid[y][x];

    for (const { dx, dy, dir } of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const neighbor = grid[ny][nx];
      const beforeSize = neighbor.size;

      const possibleSockets = new Set<number>();
      for (const tile of cell) {
        possibleSockets.add(tile.sockets[dir]);
      }

      const opposite = OPPOSITE[dir];
      for (const nTile of neighbor) {
        const nSocket = nTile.sockets[opposite];
        let compatible = false;
        for (const s of possibleSockets) {
          if (areCompatible(s, nSocket)) {
            compatible = true;
            break;
          }
        }
        if (!compatible) {
          neighbor.delete(nTile);
        }
      }

      if (neighbor.size === 0) return false;
      if (neighbor.size < beforeSize) {
        queue.push([nx, ny]);
      }
    }
  }
  return true;
}

function solveOnce(
  params: WfcParams,
  rng: () => number
): WfcTile[][] | null {
  const { width, height, tiles, density, edges, seeds } = params;
  const solidRatios = computeSolidRatios(tiles);

  const grid: Set<WfcTile>[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => new Set(tiles))
  );

  applyEdgeConstraints(grid, tiles, edges, width, height, rng);

  // Pre-place seed tiles
  if (seeds) {
    for (const { x, y, tileId } of seeds) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const match = tiles.find(
        (t) => t.id === tileId || t.id.startsWith(tileId + "_r")
      );
      if (match) {
        grid[y][x] = new Set([match]);
      }
    }
  }

  const queue: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].size < tiles.length) {
        queue.push([x, y]);
      }
    }
  }
  if (!propagate(grid, queue, width, height)) return null;

  while (true) {
    let minEntropy = Infinity;
    let candidates: Array<[number, number]> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const size = grid[y][x].size;
        if (size <= 1) continue;
        if (size < minEntropy) {
          minEntropy = size;
          candidates = [[x, y]];
        } else if (size === minEntropy) {
          candidates.push([x, y]);
        }
      }
    }

    if (candidates.length === 0) break;

    const [cx, cy] = candidates[Math.floor(rng() * candidates.length)];
    const options = [...grid[cy][cx]];
    const localDensity = cellDensity(cx, cy, width, height, density, edges);
    const chosen = pickWeighted(options, localDensity, solidRatios, cx, cy, grid, width, height, rng);
    grid[cy][cx] = new Set([chosen]);

    queue.push([cx, cy]);
    if (!propagate(grid, queue, width, height)) return null;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].size === 0) return null;
    }
  }

  return grid.map((row) => row.map((cell) => [...cell][0]));
}

const MAX_RETRIES = 10;

export function solve(params: WfcParams): WfcResult {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const seed = (params.seed ?? Date.now()) + attempt;
    const rng = createRng(seed);
    const grid = solveOnce(params, rng);
    if (grid) {
      return { success: true, grid };
    }
  }
  return { success: false, grid: null };
}
