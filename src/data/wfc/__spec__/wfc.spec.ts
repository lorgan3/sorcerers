import { describe, expect, test } from "vitest";
import { solve, tileSelectionWeight, type WfcParams } from "../wfc";
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
      densityMask: new Uint8Array(9).fill(128),
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
      densityMask: new Uint8Array(25).fill(128),
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 123,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    expect(result.grid!.length).toBe(5);
    expect(result.grid![0].length).toBe(5);
  });

  test("mask-zero cells become empty tiles", () => {
    const width = 5;
    const height = 3;
    const mask = new Uint8Array(width * height).fill(255);
    for (let x = 0; x < width; x++) mask[x] = 0; // top row empty
    const params: WfcParams = {
      width,
      height,
      tiles: testTiles,
      densityMask: mask,
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    for (const tile of result.grid![0]) {
      expect(tile.sockets.top).toBe(Socket.EMPTY);
    }
  });

  test("is deterministic with same seed", () => {
    const params: WfcParams = {
      width: 4,
      height: 4,
      tiles: testTiles,
      densityMask: new Uint8Array(16).fill(128),
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
      densityMask: new Uint8Array(25).fill(128),
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
      densityMask: new Uint8Array(100).fill(128),
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
      densityMask: new Uint8Array(9).fill(128),
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
      densityMask: new Uint8Array(9).fill(128),
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
        densityMask: new Uint8Array(24).fill(128),
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
      densityMask: new Uint8Array(32).fill(128),
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    });
    expect(result.success).toBe(true);
  });
});

describe("tileSelectionWeight", () => {
  const make = (density: number, weight: number): WfcTile => ({
    id: `t${density}`,
    imagePath: "",
    sockets: { top: Socket.EMPTY, right: Socket.EMPTY, bottom: Socket.EMPTY, left: Socket.EMPTY },
    weight,
    density,
  });

  test("a near-tier tile beats a far-tier tile even with lower base weight", () => {
    const near = tileSelectionWeight(make(0.55, 0.5), 0.6, 1); // tier 0.6, dist 0
    const far = tileSelectionWeight(make(0.95, 3.75), 0.6, 1); // tier 1.0, dist 0.4
    expect(near).toBeGreaterThan(far);
  });

  test("two tiers adjacent to a between-target are weighted comparably", () => {
    const low = tileSelectionWeight(make(0.3, 1), 0.5, 1); // tier 0.4, dist 0.1
    const high = tileSelectionWeight(make(0.5, 1), 0.5, 1); // tier 0.6, dist 0.1
    expect(Math.abs(low - high)).toBeLessThan(low * 0.2);
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

  test("mask-zero forces every cell empty", () => {
    const width = 4;
    const height = 4;
    const mask = new Uint8Array(width * height); // all zeros
    const params: WfcParams = {
      width,
      height,
      tiles: testTiles,
      densityMask: mask,
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    for (const tile of result.grid!.flat()) {
      expect(tile.density).toBe(0);
    }
  });

  test("intermediate mask values bias toward higher-density tiles", () => {
    // Identical seed; only the mask differs. A high-density mask should
    // produce more solid tiles than a low-density mask.
    const baseParams: Omit<WfcParams, "densityMask"> = {
      width: 6,
      height: 6,
      tiles: testTiles,
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 7,
    };
    const lowMask = new Uint8Array(36).fill(64); // ~25% density
    const highMask = new Uint8Array(36).fill(220); // ~86% density

    const lowResult = solve({ ...baseParams, densityMask: lowMask });
    const highResult = solve({ ...baseParams, densityMask: highMask });
    expect(lowResult.success).toBe(true);
    expect(highResult.success).toBe(true);

    const avg = (grid: WfcTile[][]) =>
      grid.flat().reduce((s, t) => s + t.density, 0) / grid.flat().length;
    expect(avg(highResult.grid!)).toBeGreaterThan(avg(lowResult.grid!));
  });

  test("hard-constraint matches any density-zero tile, not just id 'empty'", () => {
    // Same shape as testTiles but the empty tile is renamed. The solver must
    // still hard-constrain mask-zero cells to the density-zero tile.
    const renamedTiles: WfcTile[] = testTiles.map((t) =>
      t.id === "empty" ? { ...t, id: "void" } : t,
    );
    const mask = new Uint8Array(16); // all zeros
    const params: WfcParams = {
      width: 4,
      height: 4,
      tiles: renamedTiles,
      densityMask: mask,
      continuityBonus: 1.5,
      preventBlockages: false,
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    for (const tile of result.grid!.flat()) {
      expect(tile.density).toBe(0);
      expect(tile.id).toBe("void");
    }
  });
});

describe("online density correction", () => {
  const meanDensity = (grid: WfcTile[][]) => {
    const all = grid.flat();
    return all.reduce((s, t) => s + t.density, 0) / all.length;
  };

  test("realized density tracks a high target better with correction on", () => {
    const base = {
      width: 6, height: 6, tiles: testTiles,
      densityMask: new Uint8Array(36).fill(204), // 204/255 ≈ 0.8
      continuityBonus: 1.5, preventBlockages: false, seed: 7,
    };
    const on = solve({ ...base, densityCorrection: true });
    const off = solve({ ...base, densityCorrection: false });
    expect(on.success).toBe(true);
    expect(off.success).toBe(true);
    const errOn = Math.abs(meanDensity(on.grid!) - 0.8);
    const errOff = Math.abs(meanDensity(off.grid!) - 0.8);
    // Observed values (seed=7, fixed): errOn≈0.0056, errOff≈0.019.
    // Strict inequality catches the case where correction silently does nothing.
    expect(errOn).toBeLessThan(errOff);
    // Absolute bound: correction-on must bring error well below correction-off.
    expect(errOn).toBeLessThan(0.015);
  });
});
