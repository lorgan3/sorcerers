// Based on https://gist.github.com/tfry-git/3f5faa0b1c252dd1e6849da18c16570f

/** Copyright 2019 by Thomas Friedrichsmeier.
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. */

export class CollisionMask {
  private constructor(
    private w: number,
    private h: number,
    private mask: Uint32Array[]
  ) {}

  static fromAlpha(data: ImageData) {
    const w = data.width;
    const h = data.height;
    const mask: Uint32Array[] = [];

    for (var y = 0; y < h; ++y) {
      mask[y] = new Uint32Array(Math.ceil(w / 32));
      for (var x = 0; x < w; x += 32) {
        var bits = 0;
        for (var bit = 0; bit < 32; ++bit) {
          bits = bits << 1;
          if (x + bit < w) {
            if (data.data[(y * data.width + x + bit) * 4 + 3] > 128) {
              bits += 1;
            }
          }
        }
        mask[y][Math.floor(x / 32)] = bits;
      }
    }

    return new CollisionMask(w, h, mask);
  }

  static fromColor(data: ImageData) {
    const w = data.width;
    const h = data.height;
    const mask: Uint32Array[] = [];

    for (var y = 0; y < h; ++y) {
      mask[y] = new Uint32Array(Math.ceil(w / 32));
      for (var x = 0; x < w; x += 32) {
        var bits = 0;
        for (var bit = 0; bit < 32; ++bit) {
          bits = bits << 1;
          if (x + bit < w) {
            if (data.data[(y * data.width + x + bit) * 4] === 0) {
              bits += 1;
            }
          }
        }
        mask[y][Math.floor(x / 32)] = bits;
      }
    }

    return new CollisionMask(w, h, mask);
  }

  static forRect(width: number, height: number) {
    const w = width;
    const h = height;
    const mask: Uint32Array[] = [];

    for (var y = 0; y < h; ++y) {
      mask[y] = new Uint32Array(Math.ceil(w / 32));
      for (var x = 0; x < w; x += 32) {
        if (x + 32 < w) {
          mask[y][Math.floor(x / 32)] = 2 ** 32 - 1;
        } else {
          mask[y][Math.floor(x / 32)] = (2 ** 32 - 1) << Math.floor(32 - w + x);
        }
      }
    }

    return new CollisionMask(w, h, mask);
  }

  static deserialize(data: {
    width: number;
    height: number;
    mask: Uint8Array[];
  }) {
    const mask = data.mask.map((arr) => new Uint32Array(arr.buffer));
    return new CollisionMask(data.width, data.height, mask);
  }

  /** Test if this CollisionMask-objects collides with the given other collision mask object. dx and dy specify the
  screen coordinates of the other object, relative to this one. Note that this function performs rectangle intersection
  check before going into the more expensive pixel-based collision detection, so there is no need to do this, yourself. */
  collidesWith(other: CollisionMask, dx: number, dy: number): boolean {
    // make sure, this object is the left one of the two
    if (dx < 0) {
      return other.collidesWith(this, -dx, -dy);
    }

    // determine collision rectangle (if any) in terms of coordinates of this
    if (dx > this.w) return false;
    let y1, y2;
    if (dy < 0) {
      // other is above
      if (other.h < -dy) return false;
      y1 = 0;
      y2 = Math.min(other.h + dy, this.h);
    } else {
      // other is below
      if (this.h < dy) return false;
      y1 = dy;
      y2 = Math.min(other.h + dy, this.h);
    }

    const lshift = dx % 32;
    const rshift = 32 - lshift;
    const x1scaled = Math.floor(dx / 32);
    const x2scaled = Math.ceil(Math.min(this.w, other.w + dx) / 32);

    for (let y = y1; y < y2; ++y) {
      const trow = this.mask[y];
      const orow = other.mask[y - dy];
      for (let x = x1scaled; x < x2scaled; ++x) {
        let bits = trow[x] << lshift;
        if (rshift < 32) {
          // note: for whatever reason, at rshift==32, rshift will turn into a no-op,
          // silently, while actually we really want all zeros in the right fragement, then
          bits |= trow[x + 1] >>> rshift; // Note: zero-fill rshift
        }

        // since other is known to be to the right of this, its mask is always left-aligned.
        if (orow[x - x1scaled] & bits) {
          return true;
        }
      }
    }

    return false;
  }

  add(other: CollisionMask, dx: number, dy: number) {
    const x1 = Math.max(dx, 0);
    const y1 = Math.max(dy, 0);
    const y2 = Math.min(other.h + y1, this.h);
    const rshift = x1 % 32;
    const lshift = 32 - rshift;
    const x1scaled = Math.floor(x1 / 32);
    const x2scaled = Math.ceil(Math.min(this.w, other.w + x1) / 32);

    for (let y = y1; y < y2; ++y) {
      const trow = this.mask[y];
      const orow = other.mask[y - y1];
      for (let x = x1scaled; x < x2scaled; ++x) {
        let bits = orow[x - x1scaled - 1] << lshift;
        if (rshift < 32) {
          bits |= orow[x - x1scaled] >>> rshift;
        }

        trow[x] |= bits;
      }
    }
  }

  subtract(other: CollisionMask, dx: number, dy: number) {
    const x1 = Math.max(dx, 0);
    const y1 = Math.max(dy, 0);
    const y2 = Math.min(other.h + y1, this.h);
    const rshift = x1 % 32;
    const lshift = 32 - rshift;
    const x1scaled = Math.floor(x1 / 32);
    const x2scaled = Math.ceil(Math.min(this.w, other.w + x1) / 32);

    for (let y = y1; y < y2; ++y) {
      const trow = this.mask[y];
      const orow = other.mask[y - y1];
      for (let x = x1scaled; x < x2scaled; ++x) {
        let bits = orow[x - x1scaled - 1] << lshift;
        if (rshift < 32) {
          bits |= orow[x - x1scaled] >>> rshift;
        }

        trow[x] &= ~bits;
      }
    }
  }

  get width() {
    return this.w;
  }

  get height() {
    return this.h;
  }

  clone() {
    return new CollisionMask(this.w, this.h, structuredClone(this.mask));
  }

  serialize() {
    return {
      width: this.w,
      height: this.h,
      mask: this.mask.map((arr) => arr.buffer),
    };
  }
}
