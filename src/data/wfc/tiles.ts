export enum Socket {
  SOLID,
  EMPTY,
  HALF_A,
  HALF_B,
}

type Direction = "top" | "right" | "bottom" | "left";

export interface WfcTile {
  id: string;
  pixels: boolean[][];
  sockets: {
    top: Socket;
    right: Socket;
    bottom: Socket;
    left: Socket;
  };
  weight: number;
  /** If set, the neighbor in that direction must be one of the listed tile IDs (matched by prefix). */
  forcedNeighbors?: Partial<Record<Direction, string[]>>;
}

const TILE_SIZE = 16;

export function areCompatible(a: Socket, b: Socket): boolean {
  return a === b;
}

export function rotateTile(tile: WfcTile, rotations: number): WfcTile {
  let { pixels, sockets } = tile;
  let forced = tile.forcedNeighbors;
  const n = ((rotations % 4) + 4) % 4;

  for (let r = 0; r < n; r++) {
    const size = pixels.length;
    const newPixels: boolean[][] = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        newPixels[x][size - 1 - y] = pixels[y][x];
      }
    }
    pixels = newPixels;
    sockets = {
      top: sockets.left,
      right: sockets.top,
      bottom: sockets.right,
      left: sockets.bottom,
    };
    if (forced) {
      forced = {
        ...(forced.left !== undefined && { top: forced.left }),
        ...(forced.top !== undefined && { right: forced.top }),
        ...(forced.right !== undefined && { bottom: forced.right }),
        ...(forced.bottom !== undefined && { left: forced.bottom }),
      };
    }
  }

  return {
    id: `${tile.id}_r${n}`,
    pixels,
    sockets,
    weight: tile.weight,
    ...(forced &&
      Object.keys(forced).length > 0 && { forcedNeighbors: forced }),
  };
}

function makePixels(render: (x: number, y: number) => boolean): boolean[][] {
  return Array.from({ length: TILE_SIZE }, (_, y) =>
    Array.from({ length: TILE_SIZE }, (_, x) => render(x, y)),
  );
}

function expandWithRotations(
  tile: WfcTile & { rotatable: boolean },
): WfcTile[] {
  if (!tile.rotatable) {
    return [tile];
  }

  // 90° and 270° rotations turn horizontal surfaces into vertical walls.
  // Reduce their weight to favor horizontal terrain.
  const SIDEWAYS_WEIGHT = 0.6;

  const results: WfcTile[] = [tile];
  for (let r = 1; r < 4; r++) {
    const rotated = rotateTile(tile, r);
    const isDuplicate = results.some(
      (existing) =>
        existing.sockets.top === rotated.sockets.top &&
        existing.sockets.right === rotated.sockets.right &&
        existing.sockets.bottom === rotated.sockets.bottom &&
        existing.sockets.left === rotated.sockets.left,
    );
    if (!isDuplicate) {
      const isSideways = r === 1 || r === 3;
      results.push({
        ...rotated,
        weight: isSideways ? rotated.weight * SIDEWAYS_WEIGHT : rotated.weight,
      });
    }
  }
  return results;
}

const HALF = TILE_SIZE / 2;

const BASE_TILES: Array<WfcTile & { rotatable: boolean }> = [
  {
    id: "solid",
    pixels: makePixels(() => true),
    sockets: {
      top: Socket.SOLID,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SOLID,
    },
    weight: 10,
    rotatable: false,
  },
  {
    id: "empty",
    pixels: makePixels(() => false),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.EMPTY,
      left: Socket.EMPTY,
    },
    weight: 48,
    rotatable: false,
  },
  {
    id: "surface",
    pixels: makePixels((_x, y) => y >= HALF),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 0.8,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    id: "surface_thin",
    pixels: makePixels((_x, y) => y >= TILE_SIZE - 8),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 0.5,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    id: "surface_thick",
    pixels: makePixels((_x, y) => y >= TILE_SIZE / 4),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 0.5,
    forcedNeighbors: { top: ["empty"] },
    rotatable: true,
  },
  {
    id: "slope",
    pixels: makePixels((x, y) => y >= TILE_SIZE - 1 - x),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.EMPTY,
    },
    weight: 0.8,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    // ~15 degree slope: gentle rise from left to right
    id: "slope_thin",
    pixels: makePixels((x, y) => {
      const rise = TILE_SIZE * Math.tan((15 * Math.PI) / 180);
      return y >= TILE_SIZE - 1 - (rise / (TILE_SIZE - 1)) * x;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.EMPTY,
    },
    weight: 0.8,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    // ~30 degree slope: moderate rise from left to right
    id: "slope_thick",
    pixels: makePixels((x, y) => {
      const rise = TILE_SIZE * Math.tan((30 * Math.PI) / 180);
      return y >= TILE_SIZE - 1 - (rise / (TILE_SIZE - 1)) * x;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.EMPTY,
    },
    weight: 0.8,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    // Slope from half-height (left) to fully solid (right)
    // Fills the triangle between a surface tile and a solid tile
    id: "slope_half_to_solid",
    pixels: makePixels((x, y) => {
      const threshold = HALF * (1 - x / (TILE_SIZE - 1));
      return y >= threshold;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 0.8,
    rotatable: true,
    forcedNeighbors: { top: ["empty"] },
  },
  {
    id: "mound",
    pixels: makePixels((x, y) => {
      const cx = HALF;
      const cy = TILE_SIZE;
      const rx = HALF;
      const ry = HALF;
      return (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.SOLID,
      left: Socket.EMPTY,
    },
    weight: 0.02,
    rotatable: false,
  },
  {
    id: "inner_corner",
    pixels: makePixels((x, y) => x < HALF || y >= HALF),
    sockets: {
      top: Socket.HALF_A,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.SOLID,
    },
    weight: 0.3,
    rotatable: true,
  },
  {
    id: "ledge",
    pixels: makePixels((x, y) => x < TILE_SIZE * 0.7 && y >= TILE_SIZE - 6),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.HALF_A,
      left: Socket.EMPTY,
    },
    weight: 0.2,
    rotatable: true,
  },
  {
    id: "half_arch",
    pixels: makePixels((x, y) => {
      if (x >= HALF) return true;
      const archHeight = TILE_SIZE * 0.75;
      const normalizedX = x / HALF;
      const archTop = TILE_SIZE * 0.25 - normalizedX * archHeight * 0.3;
      return y < archTop;
    }),
    sockets: {
      top: Socket.SOLID,
      right: Socket.SOLID,
      bottom: Socket.HALF_A,
      left: Socket.HALF_A,
    },
    weight: 0.15,
    rotatable: true,
  },
  {
    id: "floor_box",
    pixels: makePixels((x, y) => {
      if (y >= TILE_SIZE - HALF) return true;
      const boxLeft = TILE_SIZE * 0.3;
      const boxRight = TILE_SIZE * 0.7;
      const boxTop = TILE_SIZE - HALF - HALF * 0.7;
      return x >= boxLeft && x <= boxRight && y >= boxTop;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 1,
    rotatable: false,
  },
  {
    id: "floor_boulder",
    pixels: makePixels((x, y) => {
      if (y >= TILE_SIZE - HALF) return true;
      const cx = HALF;
      const cy = TILE_SIZE - HALF;
      const r = HALF * 0.6;
      return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 1,
    rotatable: false,
  },
  {
    id: "floor_spike",
    pixels: makePixels((x, y) => {
      if (y >= TILE_SIZE - HALF) return true;
      const cx = HALF;
      const base = HALF * 0.75;
      const spikeBottom = TILE_SIZE - HALF;
      const spikeTop = spikeBottom - HALF * 0.8;
      if (y < spikeTop || y > spikeBottom) return false;
      const progress = (spikeBottom - y) / (spikeBottom - spikeTop);
      const halfWidth = base * (1 - progress);
      return x >= cx - halfWidth && x <= cx + halfWidth;
    }),
    sockets: {
      top: Socket.EMPTY,
      right: Socket.HALF_A,
      bottom: Socket.SOLID,
      left: Socket.HALF_A,
    },
    weight: 1,
    rotatable: false,
  },
];

export const TILES: WfcTile[] = BASE_TILES.flatMap(expandWithRotations);
export const TILE_SIZE_PX = TILE_SIZE;
