import { describe, expect, it } from "vitest";
import { TILES } from "../../wfc/tiles";
import { resolveTiles } from "../sandbox/builder";

describe("resolveTiles", () => {
  it("resolves tile IDs against the TILES registry", () => {
    const grid = resolveTiles([["empty", "floor"], ["solid", "solid"]]);

    expect(grid[0][0]).toBe(TILES.find((t) => t.id === "empty"));
    expect(grid[0][1]).toBe(TILES.find((t) => t.id === "floor"));
    expect(grid[1][0]).toBe(TILES.find((t) => t.id === "solid"));
    expect(grid[1][1]).toBe(TILES.find((t) => t.id === "solid"));
  });

  it("resolves mirrored variants by '_m' suffix", () => {
    const grid = resolveTiles([["ramp_m"]]);
    expect(grid[0][0].id).toBe("ramp_m");
    expect(grid[0][0].mirrored).toBe(true);
  });

  it("throws on unknown tile id", () => {
    expect(() => resolveTiles([["does-not-exist"]])).toThrow(
      /does-not-exist/,
    );
  });
});
