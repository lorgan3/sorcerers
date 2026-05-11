import { getSquareDistance } from "../../util/math";
import { Command, CommandType, Key } from "../controller/controller";
import { Character } from "../entity/character";
import { getLevel } from "../context";
import { Edge, EdgeType } from "./edge";
import { MIN_LAUNCH_SPEED, runUpDistanceFromRest } from "./physics";

export class Path {
  private static WALKING_NEXT_DISTANCE = 12;
  private static BUSTED_TIMER = 120;

  private pathIndex = 0;
  private lastX = 0;
  private lastY = 0;
  private lastDistance = Infinity;
  private bustedTimer = Path.BUSTED_TIMER;
  private stuckFrames = 0;

  // When entering a Jump edge with low speed and short approach distance,
  // we may need to walk backwards first to gain run-up. Counts down each tick;
  // when > 0, override the walk direction.
  private prerollFrames = 0;

  private pause = false;

  constructor(private character: Character, public readonly edges: Edge[]) {
    getLevel().debugLayer.drawPath(this);
    if (this.edges.length > 0) {
      getLevel().debugLayer.highlightEdge(this.edges[this.pathIndex]);
    }
  }

  get stuck() {
    return this.bustedTimer <= 0;
  }

  get done() {
    return this.pathIndex > this.edges.length - 1;
  }

  get remainingNodes() {
    return this.edges.length - this.pathIndex;
  }

  getCommand(dt: number): Command[] {
    const commands: Command[] = [{ type: CommandType.ResetKeys }];

    if (this.done || this.pause) {
      return commands;
    }

    this.bustedTimer -= dt;
    let [x, y] = this.character.body.precisePosition;
    const destination = this.edges[this.pathIndex];
    const direction = Math.sign(destination.from.x - destination.to.x);

    const nextDestination = this.edges[this.pathIndex + 1];
    const nextDirection = nextDestination
      ? Math.sign(nextDestination.from.x - nextDestination.to.x)
      : direction;

    const offset = direction > 0 ? 6 : 0;

    const distance = getSquareDistance(
      x + 3,
      y + 8,
      destination.to.x,
      destination.to.y
    );

    let hasArrived = false;

    const sameDirection = direction === nextDirection;

    if (sameDirection || direction * nextDirection === 0) {
      hasArrived =
        distance < Path.WALKING_NEXT_DISTANCE ||
        (distance > this.lastDistance && this.shouldContinuePath());
    } else if (
      Math.sign(x - destination.to.x) !== direction ||
      Math.sign(x - destination.to.x) === 0
    ) {
      hasArrived =
        distance < Path.WALKING_NEXT_DISTANCE ||
        (distance > this.lastDistance && this.shouldContinuePath());
    }

    if (!hasArrived) {
      // During pre-roll, walk OPPOSITE to the jump direction to build run-up.
      if (this.prerollFrames > 0) {
        this.prerollFrames--;
        const md = Math.sign(destination.to.x - destination.from.x);
        // md is the JUMP direction; pre-roll walks the OPPOSITE way.
        if (md > 0) {
          commands.push({ type: CommandType.KeyDown, key: Key.Left });
        } else if (md < 0) {
          commands.push({ type: CommandType.KeyDown, key: Key.Right });
        }
      } else if (
        destination.to.x > x + offset &&
        (sameDirection || this.character.body.xVelocity < 0.35)
      ) {
        commands.push({ type: CommandType.KeyDown, key: Key.Right });
      } else if (sameDirection || this.character.body.xVelocity > -0.35) {
        commands.push({ type: CommandType.KeyDown, key: Key.Left });
      }

      if (this.lastX === x && this.lastY === y) {
        this.stuckFrames++;
      } else {
        this.stuckFrames = 0;
      }

      if (this.stuckFrames > 2) {
        commands.push({ type: CommandType.KeyPress, key: Key.Up });
      } else if (
        destination.type === EdgeType.Climb ||
        this.character.body.onLadder
      ) {
        if (!this.character.body.onLadder) {
          commands.push({ type: CommandType.KeyPress, key: Key.Up });
        } else if (destination.to.y > y + 8) {
          commands.push({ type: CommandType.KeyDown, key: Key.Down });
        } else {
          commands.push({ type: CommandType.KeyDown, key: Key.Up });
        }
      } else if (destination.type === EdgeType.Jump) {
        // Movement direction: +1 if walking right (to.x > from.x), -1 if walking left.
        const md = Math.sign(destination.to.x - destination.from.x);

        // How far the character is past from.x in the movement direction.
        // Negative means still approaching; positive means at/past the edge.
        const pastEdge = (x + 3 - destination.from.x) * md;

        // xVelocity component in the movement direction.
        const speedAlong = this.character.body.xVelocity * md;

        // Launch when at-or-past the edge AND moving along the path at enough speed.
        const atLaunchPoint = pastEdge >= -1;
        const fastEnough = speedAlong >= MIN_LAUNCH_SPEED;

        // Panic-fire fallback: if we've overshot the edge AND are still going
        // forward, jump anyway. Don't fire when reversed — that'd just launch
        // backward off the cliff.
        const overshot = pastEdge > 4 && speedAlong > 0;

        if ((atLaunchPoint && fastEnough) || overshot) {
          commands.push({ type: CommandType.KeyDown, key: Key.Up });
        }
      }

      this.lastX = x;
      this.lastY = y;
    }

    if (hasArrived) {
      this.lastDistance = Infinity;
      this.pathIndex++;
      this.bustedTimer = Path.BUSTED_TIMER;

      if (!this.done) {
        getLevel().debugLayer.highlightEdge(this.edges[this.pathIndex]);

        // If the new edge is a Jump and we're starting cold (low speed, short distance
        // to from.x), schedule a backwards pre-roll. We walk away from from.x for
        // enough frames to build run-up distance.
        const newEdge = this.edges[this.pathIndex];
        if (newEdge?.type === EdgeType.Jump) {
          const md = Math.sign(newEdge.to.x - newEdge.from.x);
          const distToLaunch = (newEdge.from.x - (x + 3)) * md;
          const speedAlong = this.character.body.xVelocity * md;

          // Only pre-roll when effectively stationary or moving the wrong way.
          // If already moving forward (even slowly), natural acceleration will
          // bring us to speed before launch — pre-rolling would waste momentum.
          if (
            speedAlong < 0.1 &&
            distToLaunch > 0 &&
            distToLaunch < runUpDistanceFromRest()
          ) {
            // Walk backwards until we have enough room to accelerate.
            const needed = runUpDistanceFromRest() - Math.max(0, distToLaunch);
            // Convert pixels-to-walk-back into frames. Terminal velocity is ~0.667 px/frame,
            // so `needed / 0.667 ≈ needed * 1.5` frames at top speed.
            // We're walking backwards from rest so the average velocity is lower — this
            // conversion already accounts for that, no extra margin needed.
            this.prerollFrames = Math.ceil(needed * 1.5);
          }
        }
      }
    } else {
      this.lastDistance = distance;
    }

    commands.push({
      type: CommandType.MouseMove,
      x: (x - 30 * direction) * 6,
      y: y * 6,
    });
    return commands;
  }

  private shouldContinuePath() {
    let [x, y] = this.character.body.precisePosition;
    const nextDestination = this.edges[this.pathIndex + 1]?.to;

    if (!nextDestination) {
      return true;
    }

    const nextDistance = getSquareDistance(
      x + 3,
      y + 8,
      nextDestination.x,
      nextDestination.y
    );

    const previousDestination = this.edges[this.pathIndex].from;
    const previousDistance = getSquareDistance(
      x + 3,
      y + 8,
      previousDestination.x,
      previousDestination.y
    );

    return (
      nextDistance < previousDistance ||
      (Math.abs(nextDestination.x - previousDestination.x) < 3 &&
        nextDestination.y > previousDestination.y)
    );
  }
}
