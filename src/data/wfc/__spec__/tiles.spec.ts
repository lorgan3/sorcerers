import { describe, expect, test } from "vitest";
import {
  Socket,
  TILES,
  TILE_SIZE_PX,
  areCompatible,
  rotateTile,
  type WfcTile,
} from "../tiles";

describe("tiles", () => {
  describe("areCompatible", () => {
    test("SOLID matches SOLID", () => {
      expect(areCompatible(Socket.SOLID, Socket.SOLID)).toBe(true);
    });

    test("EMPTY matches EMPTY", () => {
      expect(areCompatible(Socket.EMPTY, Socket.EMPTY)).toBe(true);
    });

    test("HALF_A matches HALF_A", () => {
      expect(areCompatible(Socket.HALF_A, Socket.HALF_A)).toBe(true);
    });

    test("HALF_B matches HALF_B", () => {
      expect(areCompatible(Socket.HALF_B, Socket.HALF_B)).toBe(true);
    });

    test("SOLID does not match EMPTY", () => {
      expect(areCompatible(Socket.SOLID, Socket.EMPTY)).toBe(false);
    });

    test("HALF_A does not match HALF_B", () => {
      expect(areCompatible(Socket.HALF_A, Socket.HALF_B)).toBe(false);
    });

    test("HALF_A does not match SOLID", () => {
      expect(areCompatible(Socket.HALF_A, Socket.SOLID)).toBe(false);
    });
  });

  describe("rotateTile", () => {
    test("rotates sockets 90° clockwise", () => {
      const tile: WfcTile = {
        id: "test",
        pixels: [
          [true, false],
          [false, true],
        ],
        sockets: {
          top: Socket.SOLID,
          right: Socket.EMPTY,
          bottom: Socket.HALF_A,
          left: Socket.HALF_B,
        },
        weight: 1,
      };

      const rotated = rotateTile(tile, 1);

      expect(rotated.sockets.top).toBe(Socket.HALF_B);
      expect(rotated.sockets.right).toBe(Socket.SOLID);
      expect(rotated.sockets.bottom).toBe(Socket.EMPTY);
      expect(rotated.sockets.left).toBe(Socket.HALF_A);
    });

    test("rotates pixels 90° clockwise", () => {
      const tile: WfcTile = {
        id: "test",
        pixels: [
          [true, false],
          [true, true],
        ],
        sockets: {
          top: Socket.EMPTY,
          right: Socket.EMPTY,
          bottom: Socket.SOLID,
          left: Socket.SOLID,
        },
        weight: 1,
      };

      const rotated = rotateTile(tile, 1);

      expect(rotated.pixels).toEqual([
        [true, true],
        [true, false],
      ]);
    });

    test("rotates half sockets correctly for vertical/horizontal flip", () => {
      const tile: WfcTile = {
        id: "test",
        pixels: [[true]],
        sockets: {
          top: Socket.HALF_A,
          right: Socket.HALF_A,
          bottom: Socket.HALF_B,
          left: Socket.HALF_B,
        },
        weight: 1,
      };

      const rotated = rotateTile(tile, 1);

      expect(rotated.sockets.right).toBe(Socket.HALF_A);
      expect(rotated.sockets.left).toBe(Socket.HALF_B);
    });

    test("180° rotation equals two 90° rotations", () => {
      const tile: WfcTile = {
        id: "test",
        pixels: [
          [true, false, false],
          [true, true, false],
          [true, true, true],
        ],
        sockets: {
          top: Socket.EMPTY,
          right: Socket.HALF_A,
          bottom: Socket.SOLID,
          left: Socket.HALF_B,
        },
        weight: 1,
      };

      const rotated180 = rotateTile(tile, 2);
      const rotatedTwice = rotateTile(rotateTile(tile, 1), 1);

      expect(rotated180.sockets).toEqual(rotatedTwice.sockets);
      expect(rotated180.pixels).toEqual(rotatedTwice.pixels);
    });
  });

  describe("TILES", () => {
    test("tile set is non-empty", () => {
      expect(TILES.length).toBeGreaterThan(0);
    });

    test("all tiles have correct pixel grid size", () => {
      for (const tile of TILES) {
        expect(tile.pixels.length).toBe(TILE_SIZE_PX);
        for (const row of tile.pixels) {
          expect(row.length).toBe(TILE_SIZE_PX);
        }
      }
    });

    test("all tiles have positive weights", () => {
      for (const tile of TILES) {
        expect(tile.weight).toBeGreaterThan(0);
      }
    });

    test("all tiles have unique ids", () => {
      const ids = TILES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
