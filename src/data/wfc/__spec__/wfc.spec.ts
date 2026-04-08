import { describe, expect, test } from "vitest";
import { solve, type WfcParams, type WfcResult } from "../wfc";
import { TILES, Socket } from "../tiles";

describe("wfc solver", () => {
  const baseTiles = TILES;

  test("solves a 3x3 grid without contradiction", () => {
    const params: WfcParams = {
      width: 3,
      height: 3,
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
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
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0.5, right: 0.5 },
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
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
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
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 0, left: 0, right: 0 },
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
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
      seed: 99,
    };
    const result1 = solve(params);
    const result2 = solve(params);
    expect(result1.grid!.map((row) => row.map((t) => t.id))).toEqual(
      result2.grid!.map((row) => row.map((t) => t.id))
    );
  });

  test("adjacent tiles have compatible sockets", () => {
    const params: WfcParams = {
      width: 5,
      height: 5,
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0.5, right: 0.5 },
      seed: 42,
    };
    const result = solve(params);
    expect(result.success).toBe(true);
    const grid = result.grid!;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const tile = grid[y][x];
        if (x < grid[0].length - 1) {
          expect(tile.sockets.right).toBe(grid[y][x + 1].sockets.left);
        }
        if (y < grid.length - 1) {
          expect(tile.sockets.bottom).toBe(grid[y + 1][x].sockets.top);
        }
      }
    }
  });

  test("partial edge constraint produces mix of solid and empty", () => {
    const params: WfcParams = {
      width: 20,
      height: 1,
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0.5, bottom: 0.5, left: 0, right: 0 },
      seed: 42,
    };

    const result = solve(params);
    expect(result.success).toBe(true);

    const topSockets = result.grid![0].map((t) => t.sockets.top);
    const hasSolid = topSockets.some((s) => s === Socket.SOLID);
    const hasEmpty = topSockets.some((s) => s === Socket.EMPTY);

    expect(hasSolid).toBe(true);
    expect(hasEmpty).toBe(true);
  });

  test("different seeds produce different results", () => {
    const base: Omit<WfcParams, "seed"> = {
      width: 10,
      height: 10,
      tiles: baseTiles,
      density: 0.5,
      edges: { top: 0, bottom: 1, left: 0, right: 0 },
    };
    const result1 = solve({ ...base, seed: 100 });
    const result2 = solve({ ...base, seed: 200 });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    const ids1 = result1.grid!.flat().map((t) => t.id);
    const ids2 = result2.grid!.flat().map((t) => t.id);
    expect(ids1).not.toEqual(ids2);
  });

  test("forced neighbors: slopes mostly have empty tile above (soft constraint)", () => {
    let totalSlopes = 0;
    let totalEmptyAbove = 0;

    // Aggregate across multiple seeds for a stable soft-constraint check
    for (let seed = 1; seed <= 10; seed++) {
      const result = solve({
        width: 15,
        height: 10,
        tiles: baseTiles,
        density: 0.4,
        edges: { top: 0, bottom: 1, left: 0.5, right: 0.5 },
        seed,
      });
      if (!result.success || !result.grid) continue;

      const grid = result.grid;
      for (let y = 1; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          const tile = grid[y][x];
          if (tile.id.startsWith("slope") && tile.forcedNeighbors?.top) {
            totalSlopes++;
            if (grid[y - 1][x].id.startsWith("empty")) {
              totalEmptyAbove++;
            }
          }
        }
      }
    }

    if (totalSlopes > 0) {
      expect(totalEmptyAbove / totalSlopes).toBeGreaterThanOrEqual(0.5);
    }
  });
});
