import { describe, expect, test } from "vitest";
import { detectLadders } from "../postProcess";
import { Socket, type WfcTile } from "../tiles";

function makeTile(id: string, top: Socket, bottom: Socket): WfcTile {
  return {
    id,
    imagePath: "",
    sockets: { top, right: Socket.SOLID, bottom, left: Socket.SOLID },
    weight: 1,
    density: 1.0,
  };
}

describe("detectLadders", () => {
  test("detects a single ladder tile", () => {
    const grid: WfcTile[][] = [
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("solid", Socket.SOLID, Socket.SOLID)],
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("ladder", Socket.LADDER, Socket.LADDER)],
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("solid", Socket.SOLID, Socket.SOLID)],
    ];
    const ladders = detectLadders(grid);
    expect(ladders).toHaveLength(1);
    expect(ladders[0].x).toBe(1 * 80 + 40); // center of column 1
    expect(ladders[0].y).toBe(1 * 80);       // top of row 1
    expect(ladders[0].height).toBe(80);       // 1 tile tall
  });

  test("merges vertically stacked ladder tiles into one", () => {
    const grid: WfcTile[][] = [
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("ladder", Socket.LADDER, Socket.LADDER)],
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("ladder", Socket.LADDER, Socket.LADDER)],
      [makeTile("solid", Socket.SOLID, Socket.SOLID), makeTile("ladder", Socket.LADDER, Socket.LADDER)],
    ];
    const ladders = detectLadders(grid);
    expect(ladders).toHaveLength(1);
    expect(ladders[0].y).toBe(0);
    expect(ladders[0].height).toBe(240); // 3 × 80
  });

  test("returns empty array when no ladder tiles exist", () => {
    const grid: WfcTile[][] = [
      [makeTile("solid", Socket.SOLID, Socket.SOLID)],
      [makeTile("solid", Socket.SOLID, Socket.SOLID)],
    ];
    expect(detectLadders(grid)).toHaveLength(0);
  });

  test("detects multiple separate ladders in different columns", () => {
    const grid: WfcTile[][] = [
      [
        makeTile("ladder", Socket.LADDER, Socket.LADDER),
        makeTile("solid", Socket.SOLID, Socket.SOLID),
        makeTile("ladder", Socket.LADDER, Socket.LADDER),
      ],
    ];
    const ladders = detectLadders(grid);
    expect(ladders).toHaveLength(2);
  });
});
