import { describe, expect, test } from "vitest";
import { solve, type WfcParams } from "../wfc";
import { Socket, socketMultiplier, type WfcTile } from "../tiles";

// Minimal test tile set with known compatibility
const testTiles: WfcTile[] = [
  {
    id: "solid",
    imagePath: "",
    sockets: { top: Socket.SOLID, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.SOLID },
    weight: 10,
    density: 1.0,
  },
  {
    id: "empty",
    imagePath: "",
    sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
    weight: 48,
    density: 0.0,
  },
  {
    id: "surface",
    imagePath: "",
    sockets: { top: Socket.EMPTY, right: Socket.SURFACE_LOW, bottom: Socket.SOLID, left: Socket.SURFACE_LOW },
    weight: 5,
    density: 0.5,
  },
];

describe("wfc solver", () => {
  test("solves a 3x3 grid without contradiction", () => {
    const params: WfcParams = {
      width: 3,
      height: 3,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    expect(result.grid!.length).toBe(3);
    expect(result.grid![0].length).toBe(3);
  });

  test("solves a 5x5 grid", () => {
    const params: WfcParams = {
      width: 5,
      height: 5,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0.5, right: 0.5 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 123,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    expect(result.grid!.length).toBe(5);
    expect(result.grid![0].length).toBe(5);
  });

  test("respects solid bottom edge constraint", () => {
    const params: WfcParams = {
      width: 5,
      height: 3,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const bottomRow = result.grid![2];
    for (const tile of bottomRow) {
      expect(tile.sockets.bottom).toBe(Socket.SOLID);
    }
  });

  test("respects open top edge constraint", () => {
    const params: WfcParams = {
      width: 5,
      height: 3,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 0, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const topRow = result.grid![0];
    for (const tile of topRow) {
      expect(tile.sockets.top).toBe(Socket.EMPTY);
    }
  });

  test("is deterministic with same seed", () => {
    const params: WfcParams = {
      width: 4,
      height: 4,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 99,
    };
    const result1 = solve(params);
    const result2 = solve(params);
    expect(result1.grid!.map((row) => row.map((t) => t.id))).toEqual(
      result2.grid!.map((row) => row.map((t) => t.id)),
    );
  });

  test("adjacent tiles have compatible sockets (multiplier > 0)", () => {
    const params: WfcParams = {
      width: 5,
      height: 5,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0.5, right: 0.5 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const grid = result.grid!;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const tile = grid[y][x];
        if (x < grid[0].length - 1) {
          expect(socketMultiplier(tile.sockets.right, grid[y][x + 1].sockets.left, 1.0)).toBeGreaterThan(0);
        }
        if (y < grid.length - 1) {
          expect(socketMultiplier(tile.sockets.bottom, grid[y + 1][x].sockets.top, 1.0)).toBeGreaterThan(0);
        }
      }
    }
  });

  test("different seeds produce different results", () => {
    const base: Omit<WfcParams, "seed"> = {
      width: 10,
      height: 10,
      tiles: testTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
    };
    const result1 = solve({ ...base, seed: 100 });
    const result2 = solve({ ...base, seed: 200 });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    const ids1 = result1.grid!.flat().map((t) => t.id);
    const ids2 = result2.grid!.flat().map((t) => t.id);
    expect(ids1).not.toEqual(ids2);
  });

  test("avoidEdge prevents tile placement on specified edges", () => {
    const tilesWithEdge: WfcTile[] = [
      {
        id: "no-top-edge",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
        weight: 100,
        density: 0.0,
        avoidEdge: ["top"],
      },
      {
        id: "anywhere",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
        weight: 1,
        density: 0.0,
      },
    ];
    const params: WfcParams = {
      width: 3,
      height: 3,
      tiles: tilesWithEdge,
      density: 0.5,
      edges: { top: 0, bottom: 0, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    for (const tile of result.grid![0]) {
      expect(tile.id).not.toBe("no-top-edge");
    }
  });

  test("LADDER sockets are filtered from map edges", () => {
    const tilesWithLadder: WfcTile[] = [
      {
        id: "ladder-tile",
        imagePath: "",
        sockets: { top: Socket.LADDER, right: Socket.SOLID, bottom: Socket.LADDER, left: Socket.SOLID },
        weight: 100,
        density: 0.5,
      },
      {
        id: "solid",
        imagePath: "",
        sockets: { top: Socket.SOLID, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.SOLID },
        weight: 1,
        density: 1.0,
      },
    ];
    const params: WfcParams = {
      width: 3,
      height: 3,
      tiles: tilesWithLadder,
      density: 0.5,
      edges: { top: 1, bottom: 1, left: 1, right: 1 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const grid = result.grid!;
    for (const tile of grid[0]) {
      expect(tile.sockets.top).not.toBe(Socket.LADDER);
    }
    for (const tile of grid[grid.length - 1]) {
      expect(tile.sockets.bottom).not.toBe(Socket.LADDER);
    }
  });

  test("mandatory neighbors are enforced", () => {
    const tilesWithMandatory: WfcTile[] = [
      {
        id: "trigger",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
        weight: 5,
        density: 0.5,
        mandatoryNeighbors: { right: ["forced-right"] },
      },
      {
        id: "forced-right",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.SOLID, left: Socket.SOLID },
        weight: 5,
        density: 0.5,
      },
      {
        id: "solid",
        imagePath: "",
        sockets: { top: Socket.SOLID, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.SOLID },
        weight: 10,
        density: 1.0,
      },
      {
        id: "empty",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
        weight: 10,
        density: 0.0,
      },
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const result = solve({
        width: 6,
        height: 4,
        tiles: tilesWithMandatory,
        density: 0.5,
        edges: { top: 0, bottom: 1, left: 0, right: 0 },
        continuityBonus: 1.5,
        preventBlockages: false,
        seed,
      });
      if (!result.success || !result.grid) continue;
      const grid = result.grid;
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          if (grid[y][x].id === "trigger" && x < grid[0].length - 1) {
            expect(grid[y][x + 1].id).toBe("forced-right");
          }
        }
      }
    }
  });

  test("backtracking resolves contradictions from mandatory neighbors", () => {
    const constrainedTiles: WfcTile[] = [
      {
        id: "a",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.SURFACE_LOW, bottom: Socket.SOLID, left: Socket.EMPTY },
        weight: 10,
        density: 0.5,
        mandatoryNeighbors: { right: ["b"] },
      },
      {
        id: "b",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.SOLID, left: Socket.SURFACE_LOW },
        weight: 10,
        density: 0.5,
      },
      {
        id: "solid",
        imagePath: "",
        sockets: { top: Socket.SOLID, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.SOLID },
        weight: 5,
        density: 1.0,
      },
      {
        id: "empty",
        imagePath: "",
        sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
        weight: 20,
        density: 0.0,
      },
    ];
    const result = solve({
      width: 8,
      height: 4,
      tiles: constrainedTiles,
      density: 0.3,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    });
    expect(result.success).toBe(true);
  });
});

describe("solver with densityMask", () => {
  test("solves a 4x4 grid with density mask", () => {
    const mask = new Uint8Array([
        0,   0, 0, 0,
        0,   0, 0, 0,
      255, 255, 0, 0,
      255, 255, 0, 0,
    ]);
    const params: WfcParams = {
      width: 4,
      height: 4,
      tiles: testTiles,
      density: 0.8,
      edges: { top: 0, bottom: 0, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
      densityMask: mask,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    expect(result.grid!.length).toBe(4);
    expect(result.grid![0].length).toBe(4);
  });

  test("fully empty mask produces mostly empty tiles", () => {
    const mask = new Uint8Array(16); // all zeros
    const params: WfcParams = {
      width: 4,
      height: 4,
      tiles: testTiles,
      density: 0.8,
      edges: { top: 0, bottom: 0, left: 0, right: 0 },
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
      densityMask: mask,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const emptyCount = result.grid!.flat().filter((t) => t.density === 0).length;
    expect(emptyCount).toBeGreaterThan(8);
  });
});

