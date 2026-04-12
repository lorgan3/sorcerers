export enum Socket {
  SOLID,
  EMPTY,
  SURFACE_LOW,
  SURFACE_HIGH,
  DOUBLE_SURFACE,
  LADDER,
}

export type Direction = "top" | "right" | "bottom" | "left";

export interface WfcTile {
  id: string;
  imagePath: string;
  imageData?: ImageBitmap;
  sockets: {
    top: Socket;
    right: Socket;
    bottom: Socket;
    left: Socket;
  };
  weight: number;
  density: number;
  mirrored?: boolean;
  forceMirror?: boolean;
  avoidEdge?: Direction[];
  avoidSockets?: Partial<Record<Direction, Socket[]>>;
  mandatoryNeighbors?: Partial<Record<Direction, string[]>>;
}

export const TILE_SIZE_PX = 80;

// Compatibility matrix: [a][b] → multiplier (0 = incompatible)
// Self-connections (diagonal) are 1.0 here; continuity bonus is applied on top.
const BASE_MATRIX: number[][] = (() => {
  const S = Socket;
  const size = 6;
  const m: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  // Self-connections (will be multiplied by CB at call site)
  for (let i = 0; i < size; i++) m[i][i] = 1.0;

  // SOLID ↔ EMPTY: 0.3
  m[S.SOLID][S.EMPTY] = 0.3;
  m[S.EMPTY][S.SOLID] = 0.3;

  // EMPTY ↔ SURFACE_*: 0.8
  m[S.EMPTY][S.SURFACE_LOW] = 0.8;
  m[S.EMPTY][S.SURFACE_HIGH] = 0.8;
  m[S.EMPTY][S.DOUBLE_SURFACE] = 0.8;
  m[S.SURFACE_LOW][S.EMPTY] = 0.8;
  m[S.SURFACE_HIGH][S.EMPTY] = 0.8;
  m[S.DOUBLE_SURFACE][S.EMPTY] = 0.8;

  // SURFACE_* ↔ SOLID: 0.1
  m[S.SURFACE_LOW][S.SOLID] = 0.1;
  m[S.SURFACE_HIGH][S.SOLID] = 0.1;
  m[S.DOUBLE_SURFACE][S.SOLID] = 0.1;
  m[S.SOLID][S.SURFACE_LOW] = 0.1;
  m[S.SOLID][S.SURFACE_HIGH] = 0.1;
  m[S.SOLID][S.DOUBLE_SURFACE] = 0.1;

  // SURFACE_LOW ↔ SURFACE_HIGH: 0.6
  m[S.SURFACE_LOW][S.SURFACE_HIGH] = 0.6;
  m[S.SURFACE_HIGH][S.SURFACE_LOW] = 0.6;

  // DOUBLE_SURFACE ↔ SURFACE_LOW / SURFACE_HIGH: 1.0
  m[S.DOUBLE_SURFACE][S.SURFACE_LOW] = 1.0;
  m[S.DOUBLE_SURFACE][S.SURFACE_HIGH] = 1.0;
  m[S.SURFACE_LOW][S.DOUBLE_SURFACE] = 1.0;
  m[S.SURFACE_HIGH][S.DOUBLE_SURFACE] = 1.0;

  // LADDER: only self (diagonal already set to 1.0, rest stays 0)

  return m;
})();

export function socketMultiplier(
  a: Socket,
  b: Socket,
  continuityBonus: number,
  preventBlockages = false,
): number {
  let base = BASE_MATRIX[a][b];
  if (preventBlockages) {
    const S = Socket;
    if (
      (a === S.SURFACE_LOW && b === S.SOLID) ||
      (a === S.SOLID && b === S.SURFACE_LOW) ||
      (a === S.SURFACE_HIGH && b === S.SOLID) ||
      (a === S.SOLID && b === S.SURFACE_HIGH) ||
      (a === S.DOUBLE_SURFACE && b === S.SOLID) ||
      (a === S.SOLID && b === S.DOUBLE_SURFACE) ||
      (a === S.SURFACE_LOW && b === S.SURFACE_HIGH) ||
      (a === S.SURFACE_HIGH && b === S.SURFACE_LOW)
    ) {
      base = 0;
    }
  }
  if (base === 0) return 0;
  return a === b ? base * continuityBonus : base;
}

/** Create a horizontally mirrored version of a tile (left-right flip). */
export function mirrorTile(tile: WfcTile): WfcTile {
  const mirrored: WfcTile = {
    id: `${tile.id}_m`,
    imagePath: tile.imagePath,
    sockets: {
      top: tile.sockets.top,
      right: tile.sockets.left,
      bottom: tile.sockets.bottom,
      left: tile.sockets.right,
    },
    weight: tile.weight,
    density: tile.density,
    mirrored: true,
  };

  if (tile.avoidEdge) {
    mirrored.avoidEdge = tile.avoidEdge.map((e) =>
      e === "left" ? "right" : e === "right" ? "left" : e,
    );
  }

  if (tile.avoidSockets) {
    const swapped: Partial<Record<Direction, Socket[]>> = {};
    for (const [dir, sockets] of Object.entries(tile.avoidSockets)) {
      const newDir = dir === "left" ? "right" : dir === "right" ? "left" : dir;
      swapped[newDir as Direction] = sockets;
    }
    mirrored.avoidSockets = swapped;
  }

  if (tile.mandatoryNeighbors) {
    const swapped: Partial<Record<Direction, string[]>> = {};
    for (const [dir, ids] of Object.entries(tile.mandatoryNeighbors)) {
      const newDir = dir === "left" ? "right" : dir === "right" ? "left" : dir;
      // Mirrored tiles should only reference mirrored mandatory neighbors
      swapped[newDir as Direction] = ids!.map((id) => `${id}_m`);
    }
    mirrored.mandatoryNeighbors = swapped;
  }

  return mirrored;
}

/** Expand base tiles with mirrored versions, filtering symmetric duplicates. */
function expandWithMirrors(baseTiles: WfcTile[]): WfcTile[] {
  const result: WfcTile[] = [...baseTiles];

  for (const tile of baseTiles) {
    // Skip mirror if tile is left-right symmetric, unless forceMirror is set
    if (!tile.forceMirror && tile.sockets.left === tile.sockets.right) continue;
    result.push(mirrorTile(tile));
  }

  // Fix mandatory neighbor references: if a _m variant doesn't exist
  // (symmetric tile was not mirrored), fall back to the original ID.
  const tileIds = new Set(result.map((t) => t.id));
  for (const tile of result) {
    if (!tile.mandatoryNeighbors) continue;
    for (const dir of Object.keys(tile.mandatoryNeighbors) as Direction[]) {
      tile.mandatoryNeighbors[dir] = tile.mandatoryNeighbors[dir]!.map((id) => {
        if (tileIds.has(id)) return id;
        // If id_m doesn't exist, try the original (without _m suffix)
        if (id.endsWith("_m")) {
          const original = id.slice(0, -2);
          if (tileIds.has(original)) return original;
        }
        return null;
      }).filter((id): id is string => id !== null);
    }
  }

  return result;
}

// Tile image imports
import solidImg from "./tiles/solid.png";
import emptyImg from "./tiles/empty.png";
import floorImg from "./tiles/floor.png";
import islandImg from "./tiles/island.png";
import wallImg from "./tiles/wall.png";
import rampImg from "./tiles/ramp.png";
import steepWallImg from "./tiles/steepWall.png";
import halfRampImg from "./tiles/halfRamp.png";
import doubleSteepWallImg from "./tiles/doubleSteepWall.png";
import halfSolidImg from "./tiles/halfSolid.png";
import halfCeilingImg from "./tiles/halfCeiling.png";
import floorBoxImg from "./tiles/floorBox.png";
import floorStackedBoxImg from "./tiles/floorStackedBox.png";
import floorLadderImg from "./tiles/floorLadder.png";
import floorHoleImg from "./tiles/floorHole.png";
import floorLadderHoleImg from "./tiles/floorLadderHole.png";
import doubleFloorImg from "./tiles/doubleFloor.png";
import doubleFloorStepImg from "./tiles/doubleFloorStep.png";
import doubleFloorSolidImg from "./tiles/doubleFloorSolid.png";
import halfDoubleFloorSolidImg from "./tiles/halfDoubleFloorSolid.png";
import halfDoubleFloorStepImg from "./tiles/halfDoubleFloorStep.png";
import doubleJumpFloorImg from "./tiles/doubleJumpFloor.png";
import doubleFloorLadderImg from "./tiles/doubleFloorLadder.png";
import highRampImg from "./tiles/highRamp.png";
import rampEntryImg from "./tiles/rampEntry.png";
import doubleRampEntryImg from "./tiles/doubleRampEntry.png";
import doubleRampEntryStepImg from "./tiles/doubleRampEntryStep.png";
import doubleRampFloorImg from "./tiles/doubleRampFloor.png";
import doubleRampStepFloorImg from "./tiles/doubleRampStepFloor.png";
import emptyRampEntryImg from "./tiles/emptyRampEntry.png";
import floorNarrowImg from "./tiles/floorNarrow.png";
import highDipImg from "./tiles/highDip.png";

const BASE_TILES: WfcTile[] = [
  {
    id: "solid",
    imagePath: solidImg,
    sockets: {
      top: Socket.SOLID,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SOLID,
    },
    weight: 2,
    density: 1.0,
  },
  {
    id: "empty",
    imagePath: emptyImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.EMPTY,
      left: Socket.EMPTY,
    },
    weight: 0.5,
    density: 0.0,
  },
  {
    id: "floor",
    imagePath: floorImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 5,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "island",
    imagePath: islandImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.EMPTY,
      left: Socket.EMPTY,
    },
    weight: 0.3,
    density: 0.235,
    mandatoryNeighbors: {
      left: ["empty"],
      right: ["empty"],
      bottom: ["empty"],
    },
  },
  {
    id: "wall",
    imagePath: wallImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.EMPTY,
      bottom: Socket.SOLID,
      left: Socket.EMPTY,
    },
    weight: 0.5,
    density: 0.24,
    avoidEdge: ["left", "right"],
  },
  {
    id: "ramp",
    imagePath: rampImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 2,
    density: 0.506,
    avoidSockets: { bottom: [Socket.EMPTY], left: [Socket.SOLID] },
    mandatoryNeighbors: {
      top: [
        "rampEntry",
        "doubleRampEntry",
        "doubleRampEntryStep",
        "emptyRampEntry",
        "empty",
      ],
    },
  },
  {
    id: "steepWall",
    imagePath: steepWallImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 0.7,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY], left: [Socket.SOLID] },
    mandatoryNeighbors: {
      top: [
        "rampEntry",
        "doubleRampEntry",
        "doubleRampEntryStep",
        "emptyRampEntry",
        "empty",
      ],
    },
  },
  {
    id: "halfRamp",
    imagePath: halfRampImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 1,
    density: 0.228,
    avoidEdge: ["left", "right"],
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "doubleSteepWall",
    imagePath: doubleSteepWallImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SOLID,
    },
    weight: 1,
    density: 0.3,
    avoidSockets: { bottom: [Socket.SOLID] },
  },
  {
    id: "halfSolid",
    imagePath: halfSolidImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_HIGH,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_HIGH,
    },
    weight: 3,
    density: 0.55,
    avoidSockets: {
      bottom: [Socket.EMPTY],
      left: [Socket.SURFACE_LOW],
      right: [Socket.SURFACE_LOW],
    },
  },
  {
    id: "halfCeiling",
    imagePath: halfCeilingImg,
    sockets: {
      top: Socket.SOLID,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 0.7,
    density: 0.55,
    avoidSockets: { left: [Socket.SURFACE_HIGH], right: [Socket.SURFACE_HIGH] },
  },
  {
    id: "floorBox",
    imagePath: floorBoxImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 1,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "floorStackedBox",
    imagePath: floorStackedBoxImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 0.7,
    density: 0.247,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "floorLadder",
    imagePath: floorLadderImg,
    sockets: {
      top: Socket.LADDER,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 4,
    density: 0.2,
    avoidEdge: ["top"],
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "floorHole",
    imagePath: floorHoleImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.EMPTY,
      left: Socket.SURFACE_LOW,
    },
    weight: 1,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "floorLadderHole",
    imagePath: floorLadderHoleImg,
    sockets: {
      top: Socket.LADDER,
      right: Socket.SURFACE_LOW,
      bottom: Socket.LADDER,
      left: Socket.SURFACE_LOW,
    },
    weight: 4,
    density: 0.2,
    avoidEdge: ["top", "bottom"],
  },
  {
    id: "floorLadderTop",
    imagePath: floorLadderHoleImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.LADDER,
      left: Socket.SURFACE_LOW,
    },
    weight: 4,
    density: 0.2,
    avoidEdge: ["bottom"],
  },
  {
    id: "doubleFloor",
    imagePath: doubleFloorImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 6,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "doubleFloorStep",
    imagePath: doubleFloorStepImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 4,
    density: 0.2,
    forceMirror: true,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "doubleFloorSolid",
    imagePath: doubleFloorSolidImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_HIGH,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 2.8,
    density: 0.335,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "halfDoubleFloorSolid",
    imagePath: halfDoubleFloorSolidImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_HIGH,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 0.7,
    density: 0.322,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "halfDoubleFloorStep",
    imagePath: halfDoubleFloorStepImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 4,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "doubleJumpFloor",
    imagePath: doubleJumpFloorImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.EMPTY,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 1.4,
    density: 0.2,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "doubleFloorLadder",
    imagePath: doubleFloorLadderImg,
    sockets: {
      top: Socket.LADDER,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 5.6,
    density: 0.2,
    avoidEdge: ["top"],
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
  {
    id: "highRamp",
    imagePath: highRampImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SOLID,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_HIGH,
    },
    weight: 1,
    density: 0.671,
    avoidSockets: { bottom: [Socket.EMPTY], left: [Socket.SURFACE_LOW] },
    mandatoryNeighbors: {
      top: [
        "rampEntry",
        "doubleRampEntry",
        "doubleRampEntryStep",
        "emptyRampEntry",
        "empty",
      ],
    },
  },
  {
    id: "rampEntry",
    imagePath: rampEntryImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.EMPTY,
      left: Socket.SURFACE_LOW,
    },
    weight: 1,
    density: 0.2,
    forceMirror: true,
    mandatoryNeighbors: {
      bottom: [
        "ramp",
        "highRamp",
        "doubleRampFloor",
        "doubleRampStepFloor",
        "steepWall",
      ],
    },
  },
  {
    id: "emptyRampEntry",
    imagePath: emptyRampEntryImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.EMPTY,
      left: Socket.SURFACE_LOW,
    },
    weight: 1,
    density: 0.2,
    forceMirror: true,
    mandatoryNeighbors: {
      bottom: [
        "ramp",
        "highRamp",
        "doubleRampFloor",
        "doubleRampStepFloor",
        "steepWall",
      ],
    },
  },
  {
    id: "doubleRampEntry",
    imagePath: doubleRampEntryImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.EMPTY,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 1,
    density: 0.2,
    forceMirror: true,
    mandatoryNeighbors: {
      bottom: [
        "ramp",
        "highRamp",
        "doubleRampFloor",
        "doubleRampStepFloor",
        "steepWall",
      ],
    },
  },
  {
    id: "doubleRampEntryStep",
    imagePath: doubleRampEntryStepImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.DOUBLE_SURFACE,
      bottom: Socket.EMPTY,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 1,
    density: 0.2,
    forceMirror: true,
    mandatoryNeighbors: {
      bottom: [
        "ramp",
        "highRamp",
        "doubleRampFloor",
        "doubleRampStepFloor",
        "steepWall",
      ],
    },
  },
  {
    id: "doubleRampFloor",
    imagePath: doubleRampFloorImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 1,
    density: 0.221,
    avoidSockets: { bottom: [Socket.EMPTY] },
    mandatoryNeighbors: {
      top: [
        "rampEntry",
        "doubleRampEntry",
        "doubleRampEntryStep",
        "emptyRampEntry",
        "empty",
      ],
    },
  },
  {
    id: "doubleRampStepFloor",
    imagePath: doubleRampStepFloorImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.DOUBLE_SURFACE,
    },
    weight: 1,
    density: 0.221,
    avoidSockets: { bottom: [Socket.EMPTY] },
    mandatoryNeighbors: {
      top: [
        "rampEntry",
        "doubleRampEntry",
        "doubleRampEntryStep",
        "emptyRampEntry",
        "empty",
      ],
    },
  },
  {
    id: "floorNarrow",
    imagePath: floorNarrowImg,
    sockets: {
      top: Socket.SOLID,
      right: Socket.SURFACE_LOW,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_LOW,
    },
    weight: 0.7,
    density: 0.251,
  },
  {
    id: "highDip",
    imagePath: highDipImg,
    sockets: {
      top: Socket.EMPTY,
      right: Socket.SURFACE_HIGH,
      bottom: Socket.SOLID,
      left: Socket.SURFACE_HIGH,
    },
    weight: 1,
    density: 0.468,
    avoidSockets: { bottom: [Socket.EMPTY] },
  },
];

export const TILES: WfcTile[] = expandWithMirrors(BASE_TILES);
