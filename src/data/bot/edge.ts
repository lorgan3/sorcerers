import { getSquareDistance } from "../../util/math";
import { Graph } from "./graph";
import { Node } from "./node";

export enum EdgeType {
  Jump = "jump",
  Fall = "fall",
  Walk = "walk",
  Climb = "climb",
}

export class Edge {
  public from: Node;
  public to: Node;
  public type: EdgeType;
  public cost: number;

  constructor(from: Node, to: Node, type: EdgeType) {
    this.from = from;
    this.to = to;
    this.type = type;

    const distance = getSquareDistance(to.x, to.y, from.x, from.y);
    if (type === EdgeType.Walk || type === EdgeType.Climb) {
      this.cost = distance;
    } else if (type === EdgeType.Jump) {
      const xDiff = Math.abs(to.x - from.x);
      if (xDiff < 5) {
        this.cost = distance * 1.2 + 50 / xDiff;
      } else {
        this.cost = distance * 1.2;
      }
    } else {
      const heightDiff = Math.abs(to.y - from.y);
      if (heightDiff > 72) {
        // Graph fall limit
        this.cost = 1000 + distance;
      } else {
        this.cost = distance * 1.4;
      }
    }
  }
}
