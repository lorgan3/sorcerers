import { getSquareDistance } from "../../util/math";
import { Command, CommandType, Key } from "../controller/controller";
import { Character } from "../entity/character";
import { getLevel } from "../context";
import { Edge, EdgeType } from "./edge";
import {
  MIN_LAUNCH_SPEED,
  WALK_TERMINAL_VELOCITY,
  runUpDistanceFromRest,
} from "./physics";

const REVERSE_INPUT_SPEED = WALK_TERMINAL_VELOCITY / 2;

const SAFE_DESCENT_SPEED = 0.6;

const MAX_STEP = 3;

export class Path {
  private static WALKING_NEXT_DISTANCE = 12;
  private static BUSTED_TIMER = 120;
  private static STUCK_FRAMES_THRESHOLD = 2;
  private static WRONG_PLATFORM_DROP = 16;
  private static STALL_ARRIVE_DISTANCE = 144;
  private static LADDER_COLUMN_DEADZONE = 3;

  private pathIndex = 0;
  private lastX = 0;
  private lastY = 0;
  private lastDistance = Infinity;
  private bustedTimer = Path.BUSTED_TIMER;
  private stuckFrames = 0;

  private prerollFrames = 0;

  private fallRecoverFrames = 0;
  private fallRecoverDir: -1 | 1 = -1;

  private ladderTicks = 0;

  private climbBlockedFrames = 0;
  private lastClimbY: number | null = null;

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

    if (this.done) {
      return commands;
    }

    this.bustedTimer -= dt;
    const [x, y] = this.character.body.precisePosition;
    const destination = this.edges[this.pathIndex];

    const targetX = this.updateClimbTargetX(dt, x, y, destination);

    const direction = Math.sign(destination.from.x - targetX);

    const nextDestination = this.edges[this.pathIndex + 1];
    const nextDirection = nextDestination
      ? Math.sign(nextDestination.from.x - nextDestination.to.x)
      : direction;

    const climbingLadder =
      this.character.body.onLadder && destination.type === EdgeType.Climb;
    const distance = climbingLadder
      ? (y + 8 - destination.to.y) ** 2
      : getSquareDistance(x + 3, y + 8, destination.to.x, destination.to.y);

    const sameDirection = direction === nextDirection;

    const hasArrived = this.hasArrivedAt(
      destination,
      nextDestination,
      direction,
      nextDirection,
      sameDirection,
      x,
      y,
      distance,
    );

    const suppressForRisingEdge = this.updateLadderRisingEdge(dt);

    const brakeKey = this.computeBrakeKey(destination, nextDestination);

    this.detectWrongPlatformFall(destination, x, y, hasArrived);

    if (!hasArrived) {
      this.emitMovementCommands(
        commands,
        dt,
        destination,
        x,
        y,
        targetX,
        sameDirection,
        brakeKey,
        climbingLadder,
        suppressForRisingEdge,
      );
    }

    if (hasArrived) {
      this.lastDistance = Infinity;
      this.pathIndex++;
      this.bustedTimer = Path.BUSTED_TIMER;

      if (!this.done) {
        getLevel().debugLayer.highlightEdge(this.edges[this.pathIndex]);
        this.scheduleJumpPreroll(x, y);
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

  private updateClimbTargetX(
    dt: number,
    x: number,
    y: number,
    destination: Edge,
  ): number {
    let targetX = destination.to.x;
    if (this.character.body.onLadder && destination.type === EdgeType.Climb) {
      const wantsUp = y + 8 > destination.to.y;
      if (wantsUp) {
        if (this.lastClimbY !== null && y >= this.lastClimbY - 0.1) {
          this.climbBlockedFrames += dt;
        } else {
          this.climbBlockedFrames = 0;
        }
        this.lastClimbY = y;
        if (this.climbBlockedFrames > 5) {
          for (const ladder of getLevel().terrain.ladders) {
            if (
              x + 6 >= ladder.left &&
              x <= ladder.right &&
              y + 16 > ladder.top &&
              y < ladder.bottom
            ) {
              targetX = Math.round(ladder.horizontalCenter) - 3;
              break;
            }
          }
        }
      } else {
        this.climbBlockedFrames = 0;
        this.lastClimbY = null;
      }
    } else {
      this.climbBlockedFrames = 0;
      this.lastClimbY = null;
    }
    return targetX;
  }

  private hasArrivedAt(
    destination: Edge,
    nextDestination: Edge | undefined,
    direction: number,
    nextDirection: number,
    sameDirection: boolean,
    x: number,
    y: number,
    distance: number,
  ): boolean {
    const withinArrivalRadius =
      distance < Path.WALKING_NEXT_DISTANCE ||
      (distance > this.lastDistance && this.shouldContinuePath());

    let hasArrived = false;

    if (sameDirection || direction * nextDirection === 0) {
      hasArrived = withinArrivalRadius;
    } else if (
      Math.sign(x - destination.to.x) !== direction ||
      Math.sign(x - destination.to.x) === 0
    ) {
      hasArrived = withinArrivalRadius;
    }

    if (nextDestination?.type === EdgeType.Jump) {
      const jdx = Math.abs(nextDestination.dx);
      const jdy = Math.abs(nextDestination.dy);
      const jumpDir = nextDestination.direction;
      const speedAlong = this.character.body.xVelocity * jumpDir;
      const runningIntoHorizontalJump =
        jdx >= jdy && speedAlong >= MIN_LAUNCH_SPEED;

      if (!hasArrived) {
        const pastLaunch = (x + 3 - nextDestination.from.x) * jumpDir >= 0;
        if (runningIntoHorizontalJump && pastLaunch) {
          hasArrived = true;
        }
      } else if (!this.character.body.grounded && !runningIntoHorizontalJump) {
        // Don't advance onto an airborne jump edge unless we're actually
        // running into a horizontal jump; otherwise hold the current edge.
        hasArrived = false;
      }
    }

    if (
      !hasArrived &&
      destination.type === EdgeType.Jump &&
      destination.isSteep &&
      destination.dy < 0 &&
      y + 8 <= destination.to.y &&
      Math.abs(x + 3 - destination.to.x) <= 4
    ) {
      hasArrived = true;
    }

    if (
      !hasArrived &&
      !this.character.body.onLadder &&
      this.bustedTimer < Path.BUSTED_TIMER / 2 &&
      distance < Path.STALL_ARRIVE_DISTANCE
    ) {
      hasArrived = true;
    }

    return hasArrived;
  }

  private updateLadderRisingEdge(dt: number): boolean {
    const onLadder = this.character.body.onLadder;
    if (onLadder) {
      this.ladderTicks += dt;
    } else {
      this.ladderTicks = 0;
    }
    return onLadder && Math.floor(this.ladderTicks) % 4 === 0;
  }

  private computeBrakeKey(
    destination: Edge,
    nextDestination: Edge | undefined,
  ): Key | null {
    let brakeKey: Key | null = null;

    const fallAhead =
      destination.type === EdgeType.Fall
        ? destination
        : nextDestination?.type === EdgeType.Fall
          ? nextDestination
          : null;
    if (fallAhead) {
      const fallDir = fallAhead.direction || 1;
      const speedAlong = this.character.body.xVelocity * fallDir;
      if (speedAlong > SAFE_DESCENT_SPEED) {
        brakeKey = fallDir > 0 ? Key.Left : Key.Right;
      }
    }

    const isSteepJump = (e: Edge | undefined) =>
      !!e && e.type === EdgeType.Jump && e.isSteep;
    const steepJump = isSteepJump(destination)
      ? destination
      : destination.type !== EdgeType.Jump && isSteepJump(nextDestination)
        ? nextDestination
        : null;
    if (!brakeKey && steepJump) {
      const jumpDir = steepJump.direction || 1;
      const speedAlong = this.character.body.xVelocity * jumpDir;
      if (speedAlong > REVERSE_INPUT_SPEED) {
        brakeKey = jumpDir > 0 ? Key.Left : Key.Right;
      }
    }

    return brakeKey;
  }

  private detectWrongPlatformFall(
    destination: Edge,
    x: number,
    y: number,
    hasArrived: boolean,
  ): void {
    if (
      destination.type === EdgeType.Fall &&
      !hasArrived &&
      this.fallRecoverFrames <= 0 &&
      this.character.body.grounded &&
      destination.to.y - (y + 8) > Path.WRONG_PLATFORM_DROP
    ) {
      const rX = Math.round(x);
      const rY = Math.round(y);
      const mask = this.character.body.mask;
      const leftSolid = getLevel().collidesWith(mask, rX - 4, rY + 1);
      const rightSolid = getLevel().collidesWith(mask, rX + 4, rY + 1);
      if (!leftSolid && rightSolid) {
        this.fallRecoverDir = -1;
      } else if (!rightSolid && leftSolid) {
        this.fallRecoverDir = 1;
      } else {
        this.fallRecoverDir = destination.to.x - (x + 3) >= 0 ? 1 : -1;
      }
      this.fallRecoverFrames = 8;
      this.stuckFrames = 0;
    }
  }

  private emitMovementCommands(
    commands: Command[],
    dt: number,
    destination: Edge,
    x: number,
    y: number,
    targetX: number,
    sameDirection: boolean,
    brakeKey: Key | null,
    climbingLadder: boolean,
    suppressForRisingEdge: boolean,
  ): void {
    if (this.fallRecoverFrames > 0) {
      this.fallRecoverFrames -= dt;
      commands.push({
        type: CommandType.KeyDown,
        key: this.fallRecoverDir < 0 ? Key.Left : Key.Right,
      });
    } else if (this.prerollFrames > 0) {
      this.prerollFrames -= dt;
      const md = destination.direction;
      if (md > 0) {
        commands.push({ type: CommandType.KeyDown, key: Key.Left });
      } else if (md < 0) {
        commands.push({ type: CommandType.KeyDown, key: Key.Right });
      }
    } else if (suppressForRisingEdge) {
      // no horizontal input this tick
    } else if (brakeKey !== null) {
      commands.push({ type: CommandType.KeyDown, key: brakeKey });
    } else if (
      climbingLadder &&
      Math.abs(x + 3 - targetX) <= Path.LADDER_COLUMN_DEADZONE
    ) {
      // within the ladder column: no horizontal input
    } else if (
      targetX > x + 3 &&
      (sameDirection || this.character.body.xVelocity < REVERSE_INPUT_SPEED)
    ) {
      commands.push({ type: CommandType.KeyDown, key: Key.Right });
    } else if (
      sameDirection ||
      this.character.body.xVelocity > -REVERSE_INPUT_SPEED
    ) {
      commands.push({ type: CommandType.KeyDown, key: Key.Left });
    }

    if (this.lastX === x && this.lastY === y) {
      this.stuckFrames += dt;
    } else {
      this.stuckFrames = 0;
    }

    if (this.stuckFrames > Path.STUCK_FRAMES_THRESHOLD) {
      commands.push({ type: CommandType.KeyPress, key: Key.Up });
    } else if (
      destination.type === EdgeType.Climb ||
      this.character.body.onLadder
    ) {
      if (!this.character.body.onLadder) {
        commands.push({ type: CommandType.KeyDown, key: Key.Up });
      } else if (destination.to.y > y + 8) {
        commands.push({ type: CommandType.KeyDown, key: Key.Down });
      } else {
        commands.push({ type: CommandType.KeyDown, key: Key.Up });
      }
    } else if (destination.type === EdgeType.Jump) {
      const md = destination.direction;
      const pastEdge = (x + 3 - destination.from.x) * md;
      const speedAlong = this.character.body.xVelocity * md;
      const atLaunchPoint = pastEdge >= -1;
      const steep = destination.isSteep;
      const fastEnough = steep || speedAlong >= MIN_LAUNCH_SPEED;
      const overshot = pastEdge > 4 && speedAlong > 0;
      if ((atLaunchPoint && fastEnough) || overshot) {
        commands.push({ type: CommandType.KeyDown, key: Key.Up });
      }
    } else if (
      destination.type === EdgeType.Walk &&
      destination.from.y - destination.to.y > 4
    ) {
      const dir = destination.direction || 1;
      const rX = Math.round(x);
      const rY = Math.round(y);
      const stepTooTall = getLevel().collidesWith(
        this.character.body.mask,
        rX + dir * 2,
        rY - MAX_STEP,
      );
      if (destination.to.isLadder() || stepTooTall) {
        commands.push({ type: CommandType.KeyDown, key: Key.Up });
      }
    }

    this.lastX = x;
    this.lastY = y;
  }

  private scheduleJumpPreroll(x: number, y: number): void {
    const newEdge = this.edges[this.pathIndex];
    const newEdgeSteep = !!newEdge && newEdge.isSteep;
    if (newEdge?.type === EdgeType.Jump && !newEdgeSteep) {
      const md = newEdge.direction;
      const distToLaunch = (newEdge.from.x - (x + 3)) * md;
      const speedAlong = this.character.body.xVelocity * md;

      const roomAhead = Math.max(0, distToLaunch);
      if (speedAlong <= 0 && roomAhead < runUpDistanceFromRest()) {
        const needed = runUpDistanceFromRest() - roomAhead;
        const rX = Math.round(x);
        const rY = Math.round(y);
        let safeToBackUp = true;
        for (let b = 1; b <= Math.ceil(needed); b++) {
          if (
            !getLevel().collidesWith(this.character.body.mask, rX - md * b, rY + 1)
          ) {
            safeToBackUp = false;
            break;
          }
        }
        if (safeToBackUp) {
          this.prerollFrames = Math.ceil(needed / WALK_TERMINAL_VELOCITY);
        }
      }
    }
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
