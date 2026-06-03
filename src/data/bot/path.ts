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

// Horizontal speed cap while a Fall edge is current or imminent. Falls are
// steep drops onto a target platform; arriving fast (especially airborne, after
// a ramp climb) makes the body sail over the platform into whatever is below.
// Braking toward this cap keeps the descent near-vertical so the body lands on
// the intended node instead of overshooting it.
const SAFE_DESCENT_SPEED = 0.6;

// Max obstacle the body climbs while walking, in pixels — mirrors body.ts's
// MAX_STEP. Rises up to this are auto-stepped (so the bot walks ramps); taller
// ones need a hop.
const MAX_STEP = 3;

export class Path {
  private static WALKING_NEXT_DISTANCE = 12;
  private static BUSTED_TIMER = 120;
  // Frames spent stationary before nudging Up. Compared against `dt`-accumulated
  // `stuckFrames`, so the threshold is in 60Hz-equivalent frames.
  private static STUCK_FRAMES_THRESHOLD = 2;
  // A grounded body this many pixels above a Fall's target floor has overshot
  // onto a wrong platform (one body height — clearly not just a small step).
  private static WRONG_PLATFORM_DROP = 16;
  // Squared arrival radius used only by the stall rescue (~12px) — looser than
  // WALKING_NEXT_DISTANCE so a body wedged just off a node can still advance.
  private static STALL_ARRIVE_DISTANCE = 144;

  private pathIndex = 0;
  private lastX = 0;
  private lastY = 0;
  private lastDistance = Infinity;
  private bustedTimer = Path.BUSTED_TIMER;
  private stuckFrames = 0;

  // When entering a Jump edge with low speed and short approach distance,
  // we may need to walk backwards first to gain run-up. Counts down by `dt`
  // each tick; when > 0, override the walk direction.
  private prerollFrames = 0;

  // When a Fall overshoots and lands the body on a platform ABOVE the target
  // floor (e.g. the roof of an overhang flanking a narrow landing), the body
  // won't descend on its own. These drive a brief sideways nudge toward the
  // side that drops away, walking the body off the wrong platform so it
  // continues falling to the target. Counts down by `dt` like prerollFrames.
  private fallRecoverFrames = 0;
  private fallRecoverDir: -1 | 1 = -1;

  // Frame counter used to toggle horizontal direction input while on a ladder.
  // characterMovement's dismount rule fires on the RISING edge of Left/Right.
  // Holding the key continuously never produces that edge, so we briefly drop
  // it every few frames to let the next tick register as a fresh press.
  private ladderTicks = 0;

  // While climbing on a ladder, count frames during which body.y has failed
  // to decrease (likely caught on a sidewall or tube-ladder ceiling). When
  // this exceeds a threshold, the path follower biases the target x toward
  // the ladder's horizontal center to slide along the column.
  private climbBlockedFrames = 0;
  private lastClimbY: number | null = null;

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

    // While climbing on a ladder, follow the graph node's x by default; the
    // pathfinder picked it for a reason (e.g. lining up the dismount with the
    // next edge). If the climb stalls — body.y not decreasing for several
    // frames, typically because the body is caught on a sidewall or a tube-
    // ladder ceiling — bias the target x toward the ladder's horizontal
    // center so the bot slides along the column and clears the obstruction.
    let targetX = destination.to.x;
    if (
      this.character.body.onLadder &&
      destination.type === EdgeType.Climb
    ) {
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

    const direction = Math.sign(destination.from.x - targetX);

    const nextDestination = this.edges[this.pathIndex + 1];
    const nextDirection = nextDestination
      ? Math.sign(nextDestination.from.x - nextDestination.to.x)
      : direction;

    // Switch walk direction when the body CENTER (x + 3, half the 6px body)
    // reaches targetX, so the body settles centered on the node — the same
    // x + 3 the arrival check uses. A direction-dependent offset (e.g. 6 vs 0)
    // would rest the body 3px off-centre to one side or the other depending on
    // travel direction, a left/right bias that walks the body off a narrow
    // ladder column when it's approached from the "wrong" side.
    const offset = 3;

    // On a ladder mid-climb, body.x is snapped by ladder physics to the
    // ladder's column. The graph node may sit on a different x within that
    // column (e.g. ladder edge vs center), giving a constant horizontal
    // offset the bot can't close. Ignore x for the arrival distance in this
    // case — y proximity is what actually matters.
    const climbingLadder =
      this.character.body.onLadder &&
      destination.type === EdgeType.Climb;
    const distance = climbingLadder
      ? (y + 8 - destination.to.y) ** 2
      : getSquareDistance(
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

    // Horizontal run-in jump: a launch node can sit on a down-slope the body
    // skims over (passing above it, then dropping past it) so it never lands
    // within arrival range. If the next edge is a roughly-horizontal jump and
    // the bot has already reached the launch x moving into it at launch speed,
    // commit now — advance and let the jump fire in motion (within jump-grace
    // of leaving the ledge) rather than walking off and falling past the node.
    if (!hasArrived && nextDestination?.type === EdgeType.Jump) {
      const jdx = Math.abs(nextDestination.to.x - nextDestination.from.x);
      const jdy = Math.abs(nextDestination.to.y - nextDestination.from.y);
      const jumpDir = Math.sign(nextDestination.to.x - nextDestination.from.x);
      const speedAlong = this.character.body.xVelocity * jumpDir;
      const pastLaunch = (x + 3 - nextDestination.from.x) * jumpDir >= 0;
      if (jdx >= jdy && speedAlong >= MIN_LAUNCH_SPEED && pastLaunch) {
        hasArrived = true;
      }
    }

    // Don't advance into a Jump edge until the bot is grounded at the launch
    // node. Otherwise the path index races ahead while the body is still
    // airborne — e.g. tumbling up a steep staircase — so the jump fires from a
    // mid-air position and the bot launches from the wrong place.
    //
    // Exception: the horizontal run-in jump above — there the bot SHOULD commit
    // in motion. (Vertical staircase jumps stay gated: they're taken from a
    // near-standstill and need clean footing.)
    if (
      hasArrived &&
      nextDestination?.type === EdgeType.Jump &&
      !this.character.body.grounded
    ) {
      const jdx = Math.abs(nextDestination.to.x - nextDestination.from.x);
      const jdy = Math.abs(nextDestination.to.y - nextDestination.from.y);
      const jumpDir = Math.sign(nextDestination.to.x - nextDestination.from.x);
      const speedAlong = this.character.body.xVelocity * jumpDir;
      const runningIntoHorizontalJump =
        jdx >= jdy && speedAlong >= MIN_LAUNCH_SPEED;
      if (!runningIntoHorizontalJump) {
        hasArrived = false;
      }
    }

    // Vertical-overshoot arrival for steep up-jumps. A steep jump climbs a
    // near-vertical wall: the body launches into the wall and rides UP its face,
    // often past the tiny target node (a multi-node climb). It reaches the
    // node's height pinned at the node's x but keeps riding up, so it never
    // settles within the tight arrival radius — and by the time the stall
    // rescue's busted-timer window opens it has overshot above the node, back
    // outside the radius, so the edge never advances. Accept the node the moment
    // the foot has risen to/above it while horizontally on top of it; the next
    // (also steep) edge then continues the climb. Gated to steep up-jumps with
    // the body essentially at the node's x, so walks/falls/horizontal jumps are
    // untouched.
    if (
      !hasArrived &&
      destination.type === EdgeType.Jump &&
      Math.abs(destination.to.y - destination.from.y) >
        Math.abs(destination.to.x - destination.from.x) &&
      destination.to.y < destination.from.y &&
      y + 8 <= destination.to.y &&
      Math.abs(x + 3 - destination.to.x) <= 4
    ) {
      hasArrived = true;
    }

    // Stall rescue. Climbing a steep wall, the body rides up the wall face and
    // ends up a handful of pixels off each node — outside the tight arrival
    // radius — so the edge never advances and the run stalls into a re-plan.
    // Once progress has actually stalled (busted timer half-spent), accept a
    // node the body is merely near. Gated on the stall, so smooth following
    // still uses the tight radius and is unaffected.
    if (
      !hasArrived &&
      !this.character.body.onLadder &&
      this.bustedTimer < Path.BUSTED_TIMER / 2 &&
      distance < Path.STALL_ARRIVE_DISTANCE
    ) {
      hasArrived = true;
    }

    // While on a ladder, suppress the horizontal direction key every 4th tick.
    // characterMovement's dismount-via-edge rule needs a Left/Right rising edge
    // (`!wasRight && rightHeld`); a held key never triggers it.
    const onLadder = this.character.body.onLadder;
    if (onLadder) {
      this.ladderTicks += dt;
    } else {
      this.ladderTicks = 0;
    }
    const suppressForRisingEdge = onLadder && Math.floor(this.ladderTicks) % 4 === 0;

    // If a Fall edge is current (or the next edge), brake when moving too fast
    // in the fall direction so the body drops onto the target platform rather
    // than overshooting it. Applies in-air too (air control still decelerates).
    const fallAhead =
      destination.type === EdgeType.Fall
        ? destination
        : nextDestination?.type === EdgeType.Fall
          ? nextDestination
          : null;
    let brakeKey: Key | null = null;
    if (fallAhead) {
      const fallDir = Math.sign(fallAhead.to.x - fallAhead.from.x) || 1;
      const speedAlong = this.character.body.xVelocity * fallDir;
      if (speedAlong > SAFE_DESCENT_SPEED) {
        brakeKey = fallDir > 0 ? Key.Left : Key.Right;
      }
    }

    // Steep/vertical jumps are taken from near-standstill — air-control drifts
    // the body the small horizontal distance during the arc. Carrying run-up
    // momentum into them (e.g. after sprinting along a platform into a stair
    // climb) overshoots the tiny launch nodes and the body races ahead of the
    // path. Brake excess horizontal speed when a steep jump is current or next.
    const isSteepJump = (e: Edge | undefined) =>
      !!e &&
      e.type === EdgeType.Jump &&
      Math.abs(e.to.y - e.from.y) > Math.abs(e.to.x - e.from.x);
    const steepJump = isSteepJump(destination)
      ? destination
      : // Only pre-brake for a steep jump that's still ahead when we're WALKING
        // into it — there the worry is overshooting its tiny launch node. If the
        // current edge is itself a Jump, it needs its own run-up speed; braking
        // it down for the steep jump beyond would starve that launch and the bot
        // would stall on (or overshoot) the current jump.
        destination.type !== EdgeType.Jump && isSteepJump(nextDestination)
        ? nextDestination
        : null;
    if (!brakeKey && steepJump) {
      const jumpDir = Math.sign(steepJump.to.x - steepJump.from.x) || 1;
      const speedAlong = this.character.body.xVelocity * jumpDir;
      if (speedAlong > REVERSE_INPUT_SPEED) {
        brakeKey = jumpDir > 0 ? Key.Left : Key.Right;
      }
    }

    // Detect an overshot Fall that has parked the body on a platform well above
    // the target floor — it won't descend on its own. Pick the side that drops
    // away and nudge that way for a few frames so the body walks off the wrong
    // platform and resumes falling toward the target.
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
        // Both sides open (or both blocked): head back toward the target x —
        // the body overshot past it, so the drop is the way it came.
        this.fallRecoverDir = destination.to.x - (x + 3) >= 0 ? 1 : -1;
      }
      this.fallRecoverFrames = 8;
      this.stuckFrames = 0;
    }

    if (!hasArrived) {
      // Walk off a wrong (too-high) landing platform toward the drop side.
      if (this.fallRecoverFrames > 0) {
        this.fallRecoverFrames -= dt;
        commands.push({
          type: CommandType.KeyDown,
          key: this.fallRecoverDir < 0 ? Key.Left : Key.Right,
        });
        // During pre-roll, walk OPPOSITE to the jump direction to build run-up.
      } else if (this.prerollFrames > 0) {
        this.prerollFrames -= dt;
        const md = Math.sign(destination.to.x - destination.from.x);
        // md is the JUMP direction; pre-roll walks the OPPOSITE way.
        if (md > 0) {
          commands.push({ type: CommandType.KeyDown, key: Key.Left });
        } else if (md < 0) {
          commands.push({ type: CommandType.KeyDown, key: Key.Right });
        }
      } else if (suppressForRisingEdge) {
        // intentionally no horizontal input this tick
      } else if (brakeKey !== null) {
        commands.push({ type: CommandType.KeyDown, key: brakeKey });
      } else if (
        targetX > x + offset &&
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
        // Hold Up (not KeyPress) so the mount fires deterministically on the
        // next 20Hz control() tick — KeyPress toggles at 60Hz, leaving the
        // mount reliant on lucky timing between the toggle and the interval.
        if (!this.character.body.onLadder) {
          commands.push({ type: CommandType.KeyDown, key: Key.Up });
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
        // A steep/vertical jump needs no horizontal run-up (air-control covers the
        // small offset during the arc), so fire as soon as we're at the launch —
        // requiring run-up there would fight the steep-jump brake above and stall.
        const atLaunchPoint = pastEdge >= -1;
        const steep =
          Math.abs(destination.to.y - destination.from.y) >
          Math.abs(destination.to.x - destination.from.x);
        const fastEnough = steep || speedAlong >= MIN_LAUNCH_SPEED;

        // Panic-fire fallback: if we've overshot the edge AND are still going
        // forward, jump anyway. Don't fire when reversed — that'd just launch
        // backward off the cliff.
        const overshot = pastEdge > 4 && speedAlong > 0;

        if ((atLaunchPoint && fastEnough) || overshot) {
          commands.push({ type: CommandType.KeyDown, key: Key.Up });
        }
      } else if (
        destination.type === EdgeType.Walk &&
        destination.from.y - destination.to.y > 4
      ) {
        // Rising Walk edge. Press Up (hop / ladder-mount) only when needed:
        //  - the edge climbs onto a ladder node — Up mounts it, or
        //  - a step too tall for the body's auto-step (MAX_STEP=3px) sits just
        //    ahead (probe the terrain, since a gentle node-delta slope can still
        //    hide a localized ledge).
        // A gradual ramp is neither, so it's walked up — the auto-step keeps
        // pace at walk speed and jumping there is wasteful (and builds momentum
        // that overshoots what follows).
        const dir = Math.sign(destination.to.x - destination.from.x) || 1;
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

    if (hasArrived) {
      this.lastDistance = Infinity;
      this.pathIndex++;
      this.bustedTimer = Path.BUSTED_TIMER;

      if (!this.done) {
        getLevel().debugLayer.highlightEdge(this.edges[this.pathIndex]);

        // If the new edge is a Jump, schedule a backwards pre-roll when the bot
        // can't reach launch speed in the room it has ahead of the launch node.
        // We walk away from from.x for enough frames to build run-up distance.
        //
        // Steep/vertical jumps are excluded: they launch from a near-standstill
        // (air-control drifts the small horizontal offset during the arc — see
        // the steep branch above), so they need no run-up. Backing up off a
        // steep wall's narrow ledge just walks the body off it and fails the
        // jump, so hug the wall and launch in place instead.
        const newEdge = this.edges[this.pathIndex];
        const newEdgeSteep =
          !!newEdge &&
          Math.abs(newEdge.to.y - newEdge.from.y) >
            Math.abs(newEdge.to.x - newEdge.from.x);
        if (newEdge?.type === EdgeType.Jump && !newEdgeSteep) {
          const md = Math.sign(newEdge.to.x - newEdge.from.x);
          const distToLaunch = (newEdge.from.x - (x + 3)) * md;
          const speedAlong = this.character.body.xVelocity * md;

          // Pre-roll only when the bot lacks run-up AND isn't already moving
          // INTO the jump. The room check matters: when the bot drops directly
          // onto the launch node before a wide jump (distToLaunch ≤ 0, no room
          // ahead) from a standstill, natural acceleration can't save it — it
          // would walk straight off the edge with no run-up, so it must back up.
          //
          // But if the bot arrives already carrying speed toward the jump,
          // backing up is actively harmful: pre-roll walks the OPPOSITE way, so
          // it spends its frames reversing that aligned velocity, and at a launch
          // node sitting on the platform's edge it gains no real room (the
          // reversal nets ~0 displacement) — leaving the bot to re-accelerate
          // from rest into a too-short runway and drop into the gap. With
          // forward momentum the bot instead reaches launch speed within the
          // launch-tolerance zone, the same way the mirror-image launch succeeds
          // without pre-rolling. So pre-roll only when stopped or moving AWAY.
          const roomAhead = Math.max(0, distToLaunch);
          if (
            speedAlong <= 0 &&
            roomAhead < runUpDistanceFromRest()
          ) {
            // Walk backwards until we have enough room to accelerate. When the
            // bot is at or past the launch node, roomAhead is 0 and we back up
            // the full run-up distance.
            const needed = runUpDistanceFromRest() - roomAhead;
            // Only back up if there's solid ground beneath the whole reverse
            // run-up. Otherwise we'd walk off a cliff behind us — e.g. the ledge
            // of a Fall edge we just descended (the bot lands moving slowly and
            // would reverse straight back off it). A wall behind is fine: it
            // reads as solid here and merely caps how far we actually back up.
            const rX = Math.round(x);
            const rY = Math.round(y);
            let safeToBackUp = true;
            for (let b = 1; b <= Math.ceil(needed); b++) {
              if (
                !getLevel().collidesWith(
                  this.character.body.mask,
                  rX - md * b,
                  rY + 1,
                )
              ) {
                safeToBackUp = false;
                break;
              }
            }
            if (safeToBackUp) {
              // Convert pixels-to-walk-back into frames by dividing by terminal velocity.
              // We're walking backwards from rest so the average velocity is lower — this
              // conversion already accounts for that, no extra margin needed.
              this.prerollFrames = Math.ceil(needed / WALK_TERMINAL_VELOCITY);
            }
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
