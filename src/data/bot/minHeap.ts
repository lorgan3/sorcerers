/**
 * Generic binary min-heap on an array. Comparator `less(a, b)` returns true
 * when `a` should pop before `b`. No `update`/`remove` operations — callers
 * handle stale entries by storing the canonical priority externally and
 * skipping popped entries whose priority disagrees.
 */
export class MinHeap<T> {
  private items: T[] = [];

  constructor(private less: (a: T, b: T) => boolean) {}

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    this.siftUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.less(this.items[index], this.items[parent])) {
        [this.items[index], this.items[parent]] = [
          this.items[parent],
          this.items[index],
        ];
        index = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    const n = this.items.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < n && this.less(this.items[left], this.items[smallest])) {
        smallest = left;
      }
      if (right < n && this.less(this.items[right], this.items[smallest])) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [
        this.items[smallest],
        this.items[index],
      ];
      index = smallest;
    }
  }
}
