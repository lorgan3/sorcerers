import { METEOR } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
import { CollisionMask } from "../../collision/collisionMask";
import { circle30x30 } from "../../collision/precomputed/circles";

// Long enough for the Lock cursor to acquire the target before release — the Lock
// only casts once locked, so too short a hold would miss the targeting window.
const HOLD_TICKS = 70;
const BLAST_RADIUS_GAME = 16;
// Bounces that land near the target before the meteor travels off. Conservative
// starting value — refine during playtesting.
const EXPECTED_BOUNCES = 2;
// After the first explosion the meteor bounces away and keeps exploding every few
// ticks — those follow-up blasts land up to roughly this far (game units) from the
// initial impact. Allies are scored as if they were this much closer, so a target
// with a teammate "safely" outside the first blast still counts as friendly fire.
const BOUNCE_DRIFT_GAME = 30;
// The meteor body is a 30x30 circle; the explosion fires from its center.
const BODY_RADIUS_GAME = 15;
const SIM_STEP_GAME = 5;
const SIM_MAX_STEPS = 600;

export class Meteor extends ChargedHoldReleaseCast {
  public static spell = METEOR;

  protected readonly holdTicks = HOLD_TICKS;

  protected aimPoint(): [number, number] {
    return this.evaluation!.target.centerScreen;
  }

  static predictDamageAt(distanceGameUnits: number, elementalValue: number): number {
    const multiplier = 5 + elementalValue / 2;
    return (
      predictExplosiveDamage(distanceGameUnits, BLAST_RADIUS_GAME, multiplier) *
      EXPECTED_BOUNCES
    );
  }

  /**
   * Where the meteor actually lands when locked onto `lockGame`, or null when it
   * never hits terrain. Mirrors `Meteor.cast` in spells/meteor.ts: the meteor
   * spawns above the map, offset 45° to the side the caster faces, and flies a
   * straight line until its 30x30 body strikes terrain — it does not stop at the
   * lock point, and anything in the way (walls, platforms, roofs) catches it.
   */
  static simulateImpact(
    surface: CollisionMask,
    lockGame: [number, number],
    facing: number,
  ): [number, number] | null {
    const [lockX, lockY] = lockGame;
    const maxAngle = facing === 1 ? -Math.PI / 4 : Math.PI + Math.PI / 4;
    const spawnX = Math.max(
      0,
      Math.min(surface.width, lockX + Math.tan(maxAngle) * lockY),
    );
    // Matches getAngle(_x, -32, lockX - 16, lockY - 16) in Meteor.cast.
    const heading = Math.atan2(lockY - 16 + 32, lockX - 16 - spawnX);

    let x = spawnX;
    let y = -32;
    const dx = Math.cos(heading) * SIM_STEP_GAME;
    const dy = Math.sin(heading) * SIM_STEP_GAME;
    for (let i = 0; i < SIM_MAX_STEPS; i++) {
      x += dx;
      y += dy;
      if (y >= surface.height || x < -30 || x > surface.width) return null;
      if (
        y >= 0 &&
        surface.collidesWith(circle30x30, Math.round(x), Math.round(y))
      ) {
        return [x + BODY_RADIUS_GAME, y + BODY_RADIUS_GAME];
      }
    }
    return null;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const elemental = getManager().getElementValue(Element.Elemental);
    const surface = getLevel().terrain.collisionMask;
    const myX = this.character.getCenter()[0];

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Meteor.spell,
      // Wide enough to gather allies that only the drifting bounce blasts reach.
      reachScreen: (BLAST_RADIUS_GAME + 5 + BOUNCE_DRIFT_GAME) * 6,
      impactPoint: (target) => {
        const lock = target.getCenter();
        // The bot aims at the lock point, so it faces toward it when casting.
        const facing = Math.sign(lock[0] - myX) || 1;
        const impact = Meteor.simulateImpact(
          surface,
          [lock[0] / 6, lock[1] / 6],
          facing,
        );
        return impact ? [impact[0] * 6, impact[1] * 6] : null;
      },
      predictDamageAt: (d) => Meteor.predictDamageAt(d, elemental),
      predictAllyDamageAt: (d) =>
        Meteor.predictDamageAt(Math.max(0, d - BOUNCE_DRIFT_GAME), elemental),
    });

    this.getNextEvaluation();
  }
}
