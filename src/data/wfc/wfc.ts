import { Socket, socketMultiplier, type Direction, type WfcTile } from "./tiles";

export interface WfcParams {
  width: number;
  height: number;
  tiles: WfcTile[];
  density: number;
  edges: { top: number; bottom: number; left: number; right: number };
  continuityBonus: number;
  preventBlockages: boolean;
  seed?: number;
  densityMask?: Uint8Array;
}

export interface WfcResult {
  success: boolean;
  grid: WfcTile[][] | null;
}

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

const MAX_BACKTRACK_DEPTH = 200;
const MAX_RETRIES = 10;

function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellDensity(
  x: number,
  y: number,
  width: number,
  height: number,
  globalDensity: number,
  edges: WfcParams["edges"],
): number {
  const halfW = width / 2;
  const halfH = height / 2;

  const topI = Math.max(0, 1 - y / halfH);
  const bottomI = Math.max(0, 1 - (height - 1 - y) / halfH);
  const leftI = Math.max(0, 1 - x / halfW);
  const rightI = Math.max(0, 1 - (width - 1 - x) / halfW);

  const totalEdge = topI + bottomI + leftI + rightI;
  if (totalEdge === 0) return globalDensity;

  const edgeDensity =
    (topI * edges.top +
      bottomI * edges.bottom +
      leftI * edges.left +
      rightI * edges.right) /
    totalEdge;

  const globalI = Math.max(0, 1 - totalEdge);
  return globalI * globalDensity + (1 - globalI) * edgeDensity;
}

function isOnEdge(
  x: number,
  y: number,
  width: number,
  height: number,
): Direction[] {
  const edges: Direction[] = [];
  if (y === 0) edges.push("top");
  if (y === height - 1) edges.push("bottom");
  if (x === 0) edges.push("left");
  if (x === width - 1) edges.push("right");
  return edges;
}

function filterForPosition(
  tiles: WfcTile[],
  x: number,
  y: number,
  width: number,
  height: number,
): WfcTile[] {
  const edges = isOnEdge(x, y, width, height);
  if (edges.length === 0) return tiles;

  return tiles.filter((tile) => {
    if (tile.avoidEdge) {
      for (const edge of edges) {
        if (tile.avoidEdge.includes(edge)) return false;
      }
    }
    for (const edge of edges) {
      if (tile.sockets[edge] === Socket.LADDER) return false;
    }
    return true;
  });
}

function cloneGrid(grid: Set<WfcTile>[][]): Set<WfcTile>[][] {
  return grid.map((row) => row.map((cell) => new Set(cell)));
}

function restoreGrid(
  grid: Set<WfcTile>[][],
  snapshot: Set<WfcTile>[][],
  height: number,
  width: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y][x] = new Set(snapshot[y][x]);
    }
  }
}

interface Snapshot {
  grid: Set<WfcTile>[][];
  cellIndex: [number, number];
  excludedTiles: Set<string>;
}

function neighborMultiplier(
  tile: WfcTile,
  cx: number,
  cy: number,
  grid: Set<WfcTile>[][],
  width: number,
  height: number,
  continuityBonus: number,
  preventBlockages: boolean,
): number {
  let multiplier = 1;

  for (const { dx, dy, dir } of NEIGHBORS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

    const neighbor = grid[ny][nx];
    if (neighbor.size !== 1) continue;

    const nTile = [...neighbor][0];
    const opposite = OPPOSITE[dir];
    const m = socketMultiplier(
      tile.sockets[dir],
      nTile.sockets[opposite],
      continuityBonus,
      preventBlockages,
    );
    multiplier *= Math.max(m, 0.01);
  }

  return multiplier;
}

function pickWeighted(
  options: WfcTile[],
  density: number,
  cx: number,
  cy: number,
  grid: Set<WfcTile>[][],
  width: number,
  height: number,
  continuityBonus: number,
  preventBlockages: boolean,
  rng: () => number,
): WfcTile {
  const weights: number[] = [];
  let total = 0;
  for (const tile of options) {
    const base =
      tile.weight *
      neighborMultiplier(tile, cx, cy, grid, width, height, continuityBonus, preventBlockages);
    const distance = Math.abs(tile.density - density);
    const exponent = (1 - distance * 2) * 6.64;
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
  edges: WfcParams["edges"],
  width: number,
  height: number,
): void {
  const constrain = (
    cell: Set<WfcTile>,
    dir: Direction,
    edgeDensity: number,
  ) => {
    let filtered: WfcTile[];

    if (edgeDensity >= 1.0) {
      filtered = [...cell].filter((t) => t.id === "solid");
    } else if (edgeDensity <= 0) {
      filtered = [...cell].filter((t) => t.id === "empty");
    } else {
      return;
    }

    if (filtered.length > 0) {
      cell.clear();
      for (const t of filtered) cell.add(t);
    }
  };

  for (let x = 0; x < width; x++) {
    constrain(grid[0][x], "top", edges.top);
    constrain(grid[height - 1][x], "bottom", edges.bottom);
  }
  for (let y = 0; y < height; y++) {
    constrain(grid[y][0], "left", edges.left);
    constrain(grid[y][width - 1], "right", edges.right);
  }
}

function propagate(
  grid: Set<WfcTile>[][],
  queue: Array<[number, number]>,
  width: number,
  height: number,
  continuityBonus: number,
  preventBlockages: boolean,
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

      const possibleSockets = new Set<Socket>();
      for (const tile of cell) {
        possibleSockets.add(tile.sockets[dir]);
      }

      const opposite = OPPOSITE[dir];
      for (const nTile of neighbor) {
        const nSocket = nTile.sockets[opposite];
        let compatible = false;
        for (const s of possibleSockets) {
          if (socketMultiplier(s, nSocket, continuityBonus, preventBlockages) > 0) {
            compatible = true;
            break;
          }
        }
        if (compatible && nTile.avoidSockets?.[opposite]) {
          const avoided = nTile.avoidSockets[opposite]!;
          const hasNonAvoided = [...possibleSockets].some(
            (s) => !avoided.includes(s) && socketMultiplier(s, nSocket, continuityBonus, preventBlockages) > 0,
          );
          if (!hasNonAvoided) compatible = false;
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

function enforceMandatoryNeighbors(
  grid: Set<WfcTile>[][],
  x: number,
  y: number,
  width: number,
  height: number,
): Array<[number, number]> | null {
  const changed: Array<[number, number]> = [];
  const queue: Array<[number, number]> = [[x, y]];
  const visited = new Set<string>();
  visited.add(`${x},${y}`);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const cell = grid[cy][cx];
    if (cell.size !== 1) continue;

    const tile = [...cell][0];
    if (!tile.mandatoryNeighbors) continue;

    for (const { dx, dy, dir } of NEIGHBORS) {
      const mandatoryIds = tile.mandatoryNeighbors[dir];
      if (!mandatoryIds) continue;

      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return null;

      const neighbor = grid[ny][nx];
      const filtered = [...neighbor].filter((t) =>
        mandatoryIds.includes(t.id),
      );
      if (filtered.length === 0) return null;

      if (filtered.length < neighbor.size) {
        grid[ny][nx] = new Set(filtered);
        changed.push([nx, ny]);

        const key = `${nx},${ny}`;
        if (!visited.has(key) && filtered.length === 1) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }

  return changed;
}

/**
 * After propagation, enforce mandatory neighbors starting from a worklist of
 * cells to check. When a cell is constrained, its neighbors are added to the
 * worklist so we only re-check affected cells rather than scanning the full grid.
 * Returns false if a contradiction is found.
 */
function enforceAllMandatory(
  grid: Set<WfcTile>[][],
  width: number,
  height: number,
  continuityBonus: number,
  preventBlockages: boolean,
  seedCells?: Array<[number, number]>,
): boolean {
  const worklist: Array<[number, number]> = [];
  const inWorklist = new Set<string>();

  const enqueue = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (!inWorklist.has(key)) {
      inWorklist.add(key);
      worklist.push([x, y]);
    }
  };

  if (seedCells) {
    for (const [x, y] of seedCells) enqueue(x, y);
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        enqueue(x, y);
      }
    }
  }

  let wi = 0;
  while (wi < worklist.length) {
    const [x, y] = worklist[wi++];
    inWorklist.delete(`${x},${y}`);

    const cell = grid[y][x];
    if (cell.size !== 1) continue;
    const tile = [...cell][0];
    if (!tile.mandatoryNeighbors) continue;

    for (const { dx, dy, dir } of NEIGHBORS) {
      const mandatoryIds = tile.mandatoryNeighbors[dir];
      if (!mandatoryIds) continue;

      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;

      const neighbor = grid[ny][nx];
      const filtered = [...neighbor].filter((t) =>
        mandatoryIds.includes(t.id),
      );
      if (filtered.length === 0) return false;

      if (filtered.length < neighbor.size) {
        grid[ny][nx] = new Set(filtered);
        if (!propagate(grid, [[nx, ny]], width, height, continuityBonus, preventBlockages)) {
          return false;
        }
        // Propagation may have collapsed more cells — re-check neighbors
        enqueue(nx, ny);
        for (const { dx: dx2, dy: dy2 } of NEIGHBORS) {
          const nnx = nx + dx2;
          const nny = ny + dy2;
          if (nnx >= 0 && nnx < width && nny >= 0 && nny < height) {
            enqueue(nnx, nny);
          }
        }
      }
    }
  }
  return true;
}

function solveOnce(params: WfcParams, rng: () => number): WfcTile[][] | null {
  const { width, height, tiles, density, edges, continuityBonus, preventBlockages, densityMask } = params;

  const getDensity = (x: number, y: number): number => {
    if (densityMask) {
      return densityMask[y * width + x] / 255;
    }
    return cellDensity(x, y, width, height, density, edges);
  };

  const grid: Set<WfcTile>[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      new Set(filterForPosition(tiles, x, y, width, height)),
    ),
  );

  if (densityMask) {
    // Mask fully controls density; edge sliders are ignored in this mode.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!densityMask[y * width + x]) {
          const cell = grid[y][x];
          const emptyOnly = [...cell].filter((t) => t.density === 0);
          if (emptyOnly.length > 0) {
            cell.clear();
            for (const t of emptyOnly) cell.add(t);
          }
        }
      }
    }
  } else {
    applyEdgeConstraints(grid, edges, width, height);
  }

  const initQueue: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].size < tiles.length) {
        initQueue.push([x, y]);
      }
    }
  }
  if (!propagate(grid, initQueue, width, height, continuityBonus, preventBlockages)) return null;
  if (!enforceAllMandatory(grid, width, height, continuityBonus, preventBlockages)) return null;

  const stack: Snapshot[] = [];

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
    const localDensity = getDensity(cx, cy);

    const snapshot: Snapshot = {
      grid: cloneGrid(grid),
      cellIndex: [cx, cy],
      excludedTiles: new Set<string>(),
    };

    const chosen = pickWeighted(
      options,
      localDensity,
      cx,
      cy,
      grid,
      width,
      height,
      continuityBonus,
      preventBlockages,
      rng,
    );

    grid[cy][cx] = new Set([chosen]);

    const mandatoryChanged = enforceMandatoryNeighbors(grid, cx, cy, width, height);

    const changedCells = [[cx, cy] as [number, number], ...(mandatoryChanged ?? [])];
    let contradiction =
      mandatoryChanged === null ||
      !propagate(
        grid,
        changedCells,
        width,
        height,
        continuityBonus,
        preventBlockages,
      ) ||
      !enforceAllMandatory(grid, width, height, continuityBonus, preventBlockages, changedCells);

    if (!contradiction) {
      stack.push(snapshot);
      continue;
    }

    // Backtrack
    snapshot.excludedTiles.add(chosen.id);
    let current = snapshot;
    let resolved = false;

    while (!resolved) {
      restoreGrid(grid, current.grid, height, width);

      const [bx, by] = current.cellIndex;
      const remaining = [...grid[by][bx]].filter(
        (t) => !current.excludedTiles.has(t.id),
      );

      if (remaining.length > 0) {
        grid[by][bx] = new Set(remaining);
        const retryDensity = getDensity(bx, by);
        const retryChosen = pickWeighted(
          remaining,
          retryDensity,
          bx,
          by,
          grid,
          width,
          height,
          continuityBonus,
          preventBlockages,
          rng,
        );
        grid[by][bx] = new Set([retryChosen]);

        const retryMandatory = enforceMandatoryNeighbors(grid, bx, by, width, height);
        const changedCells = [[bx, by] as [number, number], ...(retryMandatory ?? [])];
        const retryOk =
          retryMandatory !== null &&
          propagate(
            grid,
            changedCells,
            width,
            height,
            continuityBonus,
            preventBlockages,
          ) &&
          enforceAllMandatory(grid, width, height, continuityBonus, preventBlockages, changedCells);

        if (retryOk) {
          stack.push(current);
          resolved = true;
        } else {
          current.excludedTiles.add(retryChosen.id);
        }
      } else {
        if (stack.length === 0 || stack.length > MAX_BACKTRACK_DEPTH) {
          return null;
        }
        current = stack.pop()!;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].size !== 1) return null;
    }
  }

  return grid.map((row) => row.map((cell) => [...cell][0]));
}

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
