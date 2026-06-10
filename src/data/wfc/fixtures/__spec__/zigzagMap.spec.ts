import { buildZigzagGrid } from "../zigzagMap";

describe("buildZigzagGrid", () => {
  it("is deterministic — two calls produce identical tile id sequences", () => {
    const a = buildZigzagGrid();
    const b = buildZigzagGrid();
    expect(a.length).toBe(8);
    expect(a[0].length).toBe(12);
    expect(a.map((row) => row.map((t) => t.id))).toEqual(
      b.map((row) => row.map((t) => t.id)),
    );
  });
});
