import { Command, CommandType, Key } from "../../controller/controller";
import { MAGIC_MISSILE } from "../../spells";
import { MagicMissile as MagicMissileEntity } from "../../spells/magicMissile";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { RangedStrategy } from "./rangedStrategy";
import { predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
import { chooseGuidanceHeading } from "./guidanceHeading";
import { FlowField } from "./flowField";

const BLAST_RADIUS_GAME = 16;
// Local-avoidance ray length while following flow-field waypoints; the global
// route is the field's job, the ray only keeps the missile off nearby walls.
const LOOKAHEAD_GAME = 14;
// Ray length for the no-route fallback, where the ray is all the guidance there is.
const FALLBACK_LOOKAHEAD_GAME = 40;
// How far ahead along the flow-field route to place the steering waypoint. More
// than the missile's turn radius (speed 1.5 / turn rate 0.1 = 15 game units) so
// turns are anticipated rather than reacted to.
const WAYPOINT_AHEAD_GAME = 24;
// Padding around the launch→target box the flow field is built for, so the field
// doesn't sample the whole map. Detours need room beyond the straight-line box:
// the widest in the test arena (off a roof, U-turn back underneath) stays within
// ~60 game units of it.
const ROUTE_MARGIN_GAME = 100;
const MAX_RANGE_SCREEN = 1500;
const SAFETY_TIMEOUT = 600; // ticks; bail if the missile never reports gone
// Screen-px vector length used to turn a steering heading into a mouse position —
// long enough that the missile tracks the angle, not the cursor's distance.
const AIM_PROJECTION_SCREEN = 300;
// target.centerScreen is the body center. During cruise, aim slightly above it so
// the missile keeps clearance from the ground the target stands on. Empirical.
const AIM_LIFT_SCREEN = 24;
// Within this range (game units) of the target, stop avoiding terrain and dive at
// the ground under the target's feet: the missile only detonates on terrain, so
// the slab below the enemy is the closest reliable detonation point. Slightly
// under the blast's effective range (BLAST_RADIUS_GAME + 5) so a terminal dive
// always lands meaningful damage.
const TERMINAL_RANGE_GAME = 18;
// Body center → feet is 8 game units; overshoot a little so the dive commits into
// the ground instead of skimming along it.
const FOOT_DROP_SCREEN = 8 * 6 + 18;

export class MagicMissile extends RangedStrategy {
  public static spell = MAGIC_MISSILE;

  static predictDamageAt(
    distanceGameUnits: number,
    arcaneValue: number,
  ): number {
    return predictExplosiveDamage(
      distanceGameUnits,
      BLAST_RADIUS_GAME,
      5 + arcaneValue,
    );
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const arcane = getManager().getElementValue(Element.Arcane);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: MagicMissile.spell,
      reachScreen: (BLAST_RADIUS_GAME + 5) * 6,
      // No LOS check — the missile steers around terrain, so range alone gates viability.
      impactPoint: (target, { myCenter }) => {
        const center = target.getCenter();
        if (Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]) > MAX_RANGE_SCREEN) {
          return null;
        }
        return center;
      },
      predictDamageAt: (d) => MagicMissile.predictDamageAt(d, arcane),
    });

    this.getNextEvaluation();
  }

  private fired = false;
  private castTime = 0;
  private cleanedUp = false;
  private flowField: FlowField | null = null;

  // Friendly positions (game units) the flight path should swing wide of — the
  // caster itself included, since the missile detonating next to the bot is just
  // as much friendly fire as hitting an ally.
  private friendlyHazards(): [number, number][] {
    const hazards: [number, number][] = [];
    getLevel().entities.forEach((entity) => {
      if (entity instanceof Character && entity.player === this.character.player) {
        const [x, y] = entity.getCenter();
        hazards.push([x / 6, y / 6]);
      }
    });
    return hazards;
  }

  // Only our own missile, so a missile fired by another bot/player isn't steered.
  private findMissile(): MagicMissileEntity | null {
    let found: MagicMissileEntity | null = null;
    getLevel().entities.forEach((entity) => {
      if (entity instanceof MagicMissileEntity && entity.owner === this.character) {
        found = entity;
      }
    });
    return found;
  }

  // Steering heading from `fromScreen` toward the target. Globally the missile
  // follows the flow field's route (which handles tunnels, U-turns and walls);
  // locally a short terrain ray with friendly-hazard penalties keeps it off
  // nearby walls. Within terminal range it dives at the ground under the
  // target's feet — the closest spot the missile can actually detonate on.
  private guidanceHeading(fromScreen: [number, number]): number {
    const surface = getLevel().terrain.collisionMask;
    const [targetX, centerY] = this.evaluation!.target.centerScreen;
    const [fx, fy] = fromScreen;
    const distGame = Math.hypot(targetX - fx, centerY - fy) / 6;

    if (distGame <= TERMINAL_RANGE_GAME) {
      return Math.atan2(centerY + FOOT_DROP_SCREEN - fy, targetX - fx);
    }

    const hazards = this.friendlyHazards();
    if (!this.flowField) {
      // Built at launch, so fx/fy is the cast position here.
      this.flowField = new FlowField(
        surface,
        [targetX / 6, centerY / 6],
        hazards,
        BLAST_RADIUS_GAME + 5,
        {
          left: Math.min(fx, targetX) / 6 - ROUTE_MARGIN_GAME,
          top: Math.min(fy, centerY) / 6 - ROUTE_MARGIN_GAME,
          right: Math.max(fx, targetX) / 6 + ROUTE_MARGIN_GAME,
          bottom: Math.max(fy, centerY) / 6 + ROUTE_MARGIN_GAME,
        },
      );
    }

    const waypoint = this.flowField.waypoint([fx / 6, fy / 6], WAYPOINT_AHEAD_GAME);
    if (waypoint) {
      return chooseGuidanceHeading(surface, [fx / 6, fy / 6], waypoint, LOOKAHEAD_GAME, {
        hazards,
        hazardRadius: BLAST_RADIUS_GAME + 5,
      });
    }

    // No route — fall back to greedy steering straight at the target and let the
    // long ray do what it can.
    return chooseGuidanceHeading(
      surface,
      [fx / 6, fy / 6],
      [targetX / 6, (centerY - AIM_LIFT_SCREEN) / 6],
      Math.min(FALLBACK_LOOKAHEAD_GAME, Math.max(distGame, 8)),
      { hazards, hazardRadius: BLAST_RADIUS_GAME + 5 },
    );
  }

  execute(dt: number): Command[] | null {
    this.castTime += dt;

    if (!this.fired) {
      this.fired = true;
      // The cast fires the missile from the character toward the mouse, so pick a
      // safe launch heading the same way the missile steers — aiming straight at
      // the target from inside a platform fires the missile into the ground at
      // the bot's own feet.
      const [cx, cy] = this.character.getCenter();
      const heading = this.guidanceHeading([cx, cy]);
      return [
        { type: CommandType.ResetKeys },
        {
          type: CommandType.MouseMove,
          x: cx + Math.cos(heading) * AIM_PROJECTION_SCREEN,
          y: cy + Math.sin(heading) * AIM_PROJECTION_SCREEN,
        },
        { type: CommandType.KeyDown, key: Key.M1 },
      ];
    }

    const missile = this.findMissile();
    if (!missile || this.castTime > SAFETY_TIMEOUT) {
      // Release M1 once before finishing so we don't leave the button held down for
      // the next strategy (it would steer/charge whatever comes next).
      if (!this.cleanedUp) {
        this.cleanedUp = true;
        return [{ type: CommandType.ResetKeys }];
      }
      return null;
    }

    const [mx, my] = missile.getCenter();
    const heading = this.guidanceHeading([mx, my]);
    return [
      {
        type: CommandType.MouseMove,
        x: mx + Math.cos(heading) * AIM_PROJECTION_SCREEN,
        y: my + Math.sin(heading) * AIM_PROJECTION_SCREEN,
      },
      { type: CommandType.KeyDown, key: Key.M1 },
    ];
  }
}
