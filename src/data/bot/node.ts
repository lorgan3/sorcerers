import { Edge, EdgeType } from "./edge";

export enum NodeType {
  Regular,
  Edge,
  Ladder,
  LadderTop,
}

export class Node {
  public x: number;
  public y: number;
  public type: NodeType;
  public edges: Edge[];

  constructor(x: number, y: number, type: NodeType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.edges = [];
  }

  connect(other: Node, type: EdgeType) {
    const slope = (this.y - other.y) / Math.abs(other.x - this.x);

    const toEdge = new Edge(
      this,
      other,
      type === EdgeType.Jump && slope < -0.8 ? EdgeType.Fall : type
    );
    this.edges.push(toEdge);

    if (type === EdgeType.Fall) {
      return;
    }

    if (other.type === NodeType.Ladder && type !== EdgeType.Climb) {
      return;
    }

    const fromEdge = new Edge(
      other,
      this,
      type === EdgeType.Jump && slope > 0.8 ? EdgeType.Fall : type
    );
    other.edges.push(fromEdge);
  }

  toString() {
    return Node.createKey(this.x, this.y);
  }

  isLadder() {
    return this.type === NodeType.Ladder || this.type === NodeType.LadderTop;
  }

  getDirection(other: Node) {
    return Math.sign(this.x - other.x);
  }

  static createKey(x: number, y: number) {
    return `${x},${y}`;
  }
}
