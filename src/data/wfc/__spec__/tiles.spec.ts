import { describe, expect, test } from "vitest";
import { Socket, socketMultiplier, mirrorTile, TILES, type WfcTile } from "../tiles";

describe("socketMultiplier", () => {
  const CB = 2.0; // continuity bonus for testing

  test("self-connections get continuity bonus", () => {
    expect(socketMultiplier(Socket.SOLID, Socket.SOLID, CB)).toBe(CB);
    expect(socketMultiplier(Socket.EMPTY, Socket.EMPTY, CB)).toBe(CB);
    expect(socketMultiplier(Socket.SURFACE_LOW, Socket.SURFACE_LOW, CB)).toBe(CB);
    expect(socketMultiplier(Socket.SURFACE_HIGH, Socket.SURFACE_HIGH, CB)).toBe(CB);
    expect(socketMultiplier(Socket.DOUBLE_SURFACE, Socket.DOUBLE_SURFACE, CB)).toBe(CB);
    expect(socketMultiplier(Socket.LADDER, Socket.LADDER, CB)).toBe(CB);
  });

  test("EMPTY connects to non-SOLID with 0.8 multiplier", () => {
    expect(socketMultiplier(Socket.EMPTY, Socket.SURFACE_LOW, CB)).toBe(0.8);
    expect(socketMultiplier(Socket.EMPTY, Socket.SURFACE_HIGH, CB)).toBe(0.8);
    expect(socketMultiplier(Socket.EMPTY, Socket.DOUBLE_SURFACE, CB)).toBe(0.8);
    expect(socketMultiplier(Socket.SURFACE_LOW, Socket.EMPTY, CB)).toBe(0.8);
    expect(socketMultiplier(Socket.SURFACE_HIGH, Socket.EMPTY, CB)).toBe(0.8);
    expect(socketMultiplier(Socket.DOUBLE_SURFACE, Socket.EMPTY, CB)).toBe(0.8);
  });

  test("EMPTY connects to SOLID with 0.3 multiplier", () => {
    expect(socketMultiplier(Socket.EMPTY, Socket.SOLID, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.SOLID, Socket.EMPTY, CB)).toBe(0.3);
  });

  test("SURFACE_LOW and SURFACE_HIGH connect with 0.6 multiplier", () => {
    expect(socketMultiplier(Socket.SURFACE_LOW, Socket.SURFACE_HIGH, CB)).toBe(0.6);
    expect(socketMultiplier(Socket.SURFACE_HIGH, Socket.SURFACE_LOW, CB)).toBe(0.6);
  });

  test("all SURFACE types connect to SOLID with 0.3 multiplier", () => {
    expect(socketMultiplier(Socket.SURFACE_LOW, Socket.SOLID, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.SURFACE_HIGH, Socket.SOLID, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.DOUBLE_SURFACE, Socket.SOLID, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.SOLID, Socket.SURFACE_LOW, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.SOLID, Socket.SURFACE_HIGH, CB)).toBe(0.3);
    expect(socketMultiplier(Socket.SOLID, Socket.DOUBLE_SURFACE, CB)).toBe(0.3);
  });

  test("DOUBLE_SURFACE connects to SURFACE_LOW and SURFACE_HIGH with 1.0", () => {
    expect(socketMultiplier(Socket.DOUBLE_SURFACE, Socket.SURFACE_LOW, CB)).toBe(1.0);
    expect(socketMultiplier(Socket.DOUBLE_SURFACE, Socket.SURFACE_HIGH, CB)).toBe(1.0);
    expect(socketMultiplier(Socket.SURFACE_LOW, Socket.DOUBLE_SURFACE, CB)).toBe(1.0);
    expect(socketMultiplier(Socket.SURFACE_HIGH, Socket.DOUBLE_SURFACE, CB)).toBe(1.0);
  });

  test("LADDER only connects to LADDER", () => {
    expect(socketMultiplier(Socket.LADDER, Socket.SOLID, CB)).toBe(0);
    expect(socketMultiplier(Socket.LADDER, Socket.EMPTY, CB)).toBe(0);
    expect(socketMultiplier(Socket.LADDER, Socket.SURFACE_LOW, CB)).toBe(0);
    expect(socketMultiplier(Socket.LADDER, Socket.SURFACE_HIGH, CB)).toBe(0);
    expect(socketMultiplier(Socket.LADDER, Socket.DOUBLE_SURFACE, CB)).toBe(0);
    expect(socketMultiplier(Socket.SOLID, Socket.LADDER, CB)).toBe(0);
    expect(socketMultiplier(Socket.EMPTY, Socket.LADDER, CB)).toBe(0);
  });

  test("incompatible sockets return 0", () => {
    expect(socketMultiplier(Socket.SOLID, Socket.SOLID, 1.0)).toBe(1.0);
  });

  test("continuity bonus of 1.0 means no boost", () => {
    expect(socketMultiplier(Socket.SOLID, Socket.SOLID, 1.0)).toBe(1.0);
    expect(socketMultiplier(Socket.EMPTY, Socket.EMPTY, 1.0)).toBe(1.0);
  });

  test("continuity bonus of 3.0 triples self-connection weight", () => {
    expect(socketMultiplier(Socket.SOLID, Socket.SOLID, 3.0)).toBe(3.0);
  });
});

describe("mirrorTile", () => {
  test("swaps left and right sockets", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "test.png",
      sockets: {
        top: Socket.EMPTY,
        right: Socket.SURFACE_LOW,
        bottom: Socket.SOLID,
        left: Socket.SURFACE_HIGH,
      },
      weight: 5,
      density: 0.5,
    };
    const mirrored = mirrorTile(tile);
    expect(mirrored.sockets.top).toBe(Socket.EMPTY);
    expect(mirrored.sockets.right).toBe(Socket.SURFACE_HIGH);
    expect(mirrored.sockets.bottom).toBe(Socket.SOLID);
    expect(mirrored.sockets.left).toBe(Socket.SURFACE_LOW);
  });

  test("appends _m suffix to id", () => {
    const tile: WfcTile = {
      id: "slope",
      imagePath: "slope.png",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 1,
      density: 0.5,
    };
    expect(mirrorTile(tile).id).toBe("slope_m");
  });

  test("preserves weight, density, and imagePath", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "test.png",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 3.5,
      density: 0.42,
    };
    const mirrored = mirrorTile(tile);
    expect(mirrored.weight).toBe(3.5);
    expect(mirrored.density).toBe(0.42);
    expect(mirrored.imagePath).toBe("test.png");
  });

  test("sets mirrored flag to true", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "test.png",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 1,
      density: 0.5,
    };
    expect(mirrorTile(tile).mirrored).toBe(true);
  });

  test("swaps left/right in avoidEdge", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 1,
      density: 0.5,
      avoidEdge: ["left", "top"],
    };
    const mirrored = mirrorTile(tile);
    expect(mirrored.avoidEdge).toContain("right");
    expect(mirrored.avoidEdge).toContain("top");
    expect(mirrored.avoidEdge).not.toContain("left");
  });

  test("swaps left/right in avoidSockets", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 1,
      density: 0.5,
      avoidSockets: { right: [Socket.EMPTY] },
    };
    const mirrored = mirrorTile(tile);
    expect(mirrored.avoidSockets?.left).toEqual([Socket.EMPTY]);
    expect(mirrored.avoidSockets?.right).toBeUndefined();
  });

  test("swaps left/right in mandatoryNeighbors and uses _m variants only", () => {
    const tile: WfcTile = {
      id: "test",
      imagePath: "",
      sockets: { top: Socket.EMPTY, right: Socket.SOLID, bottom: Socket.SOLID, left: Socket.EMPTY },
      weight: 1,
      density: 0.5,
      mandatoryNeighbors: { right: ["partner"] },
    };
    const mirrored = mirrorTile(tile);
    expect(mirrored.mandatoryNeighbors?.left).toEqual(["partner_m"]);
    expect(mirrored.mandatoryNeighbors?.right).toBeUndefined();
  });
});

describe("TILES (with mirrors)", () => {
  test("symmetric tiles are not duplicated", () => {
    // solid and empty have left === right and no forceMirror, so no mirror needed
    const solidIds = TILES.filter((t) => t.id === "solid" || t.id === "solid_m");
    expect(solidIds.length).toBe(1);
    const emptyIds = TILES.filter((t) => t.id === "empty" || t.id === "empty_m");
    expect(emptyIds.length).toBe(1);
  });

  test("all tiles have unique ids", () => {
    const ids = TILES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("mirrored tiles have mirrored flag set", () => {
    for (const tile of TILES) {
      if (tile.id.endsWith("_m")) {
        expect(tile.mirrored).toBe(true);
      } else {
        expect(tile.mirrored).toBeFalsy();
      }
    }
  });
});
