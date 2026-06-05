import { getDistance } from "../../util/math";
import { Graph } from "./graph";
import { Node } from "./node";
import { MAX_SAFE_FALL_HEIGHT } from "./physics";

const JUMP_COST_FACTOR = 1.2;
const FALL_COST_FACTOR = 1.4;
const VERTICAL_JUMP_PENALTY = 50;
const NARROW_JUMP_XDIFF = 5;
const UNREACHABLE_FALL_COST = 1000;

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
  public readonly dx: number;
  public readonly dy: number;
  public readonly direction: -1 | 0 | 1;
  public readonly isSteep: boolean;
  public readonly isVertical: boolean;

  constructor(from: Node, to: Node, type: EdgeType) {
    this.from = from;
    this.to = to;
    this.type = type;

    this.dx = to.x - from.x;
    this.dy = to.y - from.y;
    this.direction = Math.sign(this.dx) as -1 | 0 | 1;
    this.isSteep = Math.abs(this.dy) > Math.abs(this.dx);
    this.isVertical = this.dx === 0;

    const distance = getDistance(to.x, to.y, from.x, from.y);
    if (type === EdgeType.Walk || type === EdgeType.Climb) {
      this.cost = distance;
    } else if (type === EdgeType.Jump) {
      const xDiff = Math.abs(this.dx);
      if (xDiff < NARROW_JUMP_XDIFF) {
        this.cost = distance * JUMP_COST_FACTOR + VERTICAL_JUMP_PENALTY / xDiff;
      } else {
        this.cost = distance * JUMP_COST_FACTOR;
      }
    } else {
      const heightDiff = Math.abs(this.dy);
      if (heightDiff > MAX_SAFE_FALL_HEIGHT) {
        this.cost = UNREACHABLE_FALL_COST + distance;
      } else {
        this.cost = distance * FALL_COST_FACTOR;
      }
    }
  }
}
