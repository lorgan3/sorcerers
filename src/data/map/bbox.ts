export interface PlainBBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class BBox {
  static create(width: number, height: number) {
    return new BBox(0, 0, width, height);
  }

  static fromJS(js: PlainBBox | object) {
    if ("left" in js && "top" in js && "right" in js && "bottom" in js) {
      return new BBox(js.left, js.top, js.right, js.bottom);
    }
  }

  constructor(
    public left: number,
    public top: number,
    public right: number,
    public bottom: number
  ) {}

  get width() {
    return this.right - this.left;
  }

  get height() {
    return this.bottom - this.top;
  }

  isEmpty() {
    return !this.left && !this.top && !this.right && !this.bottom;
  }

  clone() {
    return new BBox(this.left, this.top, this.right, this.bottom);
  }

  with(prop: "left" | "top" | "right" | "bottom", value: number) {
    const bbox = this.clone();
    bbox[prop] = value;

    return bbox;
  }

  move(x: number, y: number) {
    const bbox = this.clone();
    bbox["left"] += x;
    bbox["top"] += y;
    bbox["right"] += x;
    bbox["bottom"] += y;

    return bbox;
  }

  withScale(scale: number) {
    const bbox = this.clone();

    bbox.left *= scale;
    bbox.top *= scale;
    bbox.right *= scale;
    bbox.bottom *= scale;

    return bbox;
  }

  toJS(): PlainBBox {
    return {
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
    };
  }
}
