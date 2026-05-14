import { describe, expect, it } from "vitest";
import { MinHeap } from "../minHeap";

describe("MinHeap", () => {
  const numericLess = (a: number, b: number) => a < b;

  it("returns undefined on pop from empty heap", () => {
    const heap = new MinHeap<number>(numericLess);
    expect(heap.size).toBe(0);
    expect(heap.pop()).toBeUndefined();
  });

  it("returns items in ascending order for randomised input", () => {
    const heap = new MinHeap<number>(numericLess);
    const input = [7, 3, 9, 1, 4, 8, 2, 6, 5, 0];
    for (const n of input) heap.push(n);
    expect(heap.size).toBe(input.length);

    const out: number[] = [];
    while (heap.size > 0) {
      out.push(heap.pop()!);
    }
    expect(out).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("size reflects push/pop activity", () => {
    const heap = new MinHeap<number>(numericLess);
    heap.push(5);
    heap.push(3);
    expect(heap.size).toBe(2);
    heap.pop();
    expect(heap.size).toBe(1);
    heap.pop();
    expect(heap.size).toBe(0);
  });

  it("supports the lazy-deletion pattern via comparator", () => {
    interface Entry {
      id: string;
      priority: number;
    }
    const canonical = new Map<string, number>();
    canonical.set("A", 10);
    const heap = new MinHeap<Entry>((a, b) => a.priority < b.priority);

    heap.push({ id: "A", priority: 10 });
    canonical.set("A", 5);
    heap.push({ id: "A", priority: 5 });

    const out: Entry[] = [];
    while (heap.size > 0) {
      const e = heap.pop()!;
      if (e.priority !== canonical.get(e.id)) continue;
      out.push(e);
    }

    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ id: "A", priority: 5 });
  });
});
