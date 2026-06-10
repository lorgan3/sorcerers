import { DORAGATE } from "../../spells";
import { getLevel, getManager } from "../../context";
import { chooseBallisticHeading } from "./ballistics";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { ChargedHoldReleaseCast } from "./chargedHoldReleaseCast";
import { hasLineOfSight, predictExplosiveDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";

const HOLD_TICKS = 40;
const PEBBLE_RADIUS_GAME = 4;
// Of the 4+ launched pebbles, assume ~2 graze a point target. Conservative
// starting value — refine during playtesting.
const EXPECTED_PEBBLES = 2;
const MAX_RANGE_SCREEN = 600;
// The pebble volley lands shotgun-like around the lock point, up to roughly this
// far out (observed in the spell-test harness). Allies are scored as if this much
// closer, so teammates standing right beside the target count as friendly fire.
const PEBBLE_SCATTER_GAME = 15;
// Pebble flight — matches Doragate.launchPower and Pebble's gravity.
const PEBBLE_SPEED = 6;
const PEBBLE_GRAVITY = 0.1;
const PEBBLE_FLIGHT_TICKS = 120;
// The pebble cloud floats around this offset from the caster's center (game
// units) when it launches; aim from its centroid so the lead suits the volley.
const CLOUD_LIFT_GAME = 4;
const AIM_PROJECTION_SCREEN = 300;

export class Doragate extends ChargedHoldReleaseCast {
  public static spell = DORAGATE;

  protected readonly holdTicks = HOLD_TICKS;

  // All pebbles launch along one shared direction; without gravity lead they
  // arrive ~8 units low over a typical shot and the lower-spawned ones clip the
  // floor short of the target. Aim the volley's centroid trajectory through the
  // target's body instead.
  protected aimPoint(): [number, number] {
    const [cx, cy] = this.character.getCenter();
    const target = this.evaluation!.target.centerScreen;
    const aim = chooseBallisticHeading(
      getLevel().terrain.collisionMask,
      [cx / 6, cy / 6 - CLOUD_LIFT_GAME],
      [target[0] / 6, target[1] / 6],
      PEBBLE_SPEED,
      PEBBLE_GRAVITY,
      PEBBLE_FLIGHT_TICKS,
      PEBBLE_SCATTER_GAME,
    );
    if (!aim) return target;
    return [
      cx + Math.cos(aim.heading) * AIM_PROJECTION_SCREEN,
      cy + Math.sin(aim.heading) * AIM_PROJECTION_SCREEN,
    ];
  }

  static predictDamageAt(distanceGameUnits: number, arcaneValue: number): number {
    const multiplier = 1.5 + arcaneValue * 0.7;
    return predictExplosiveDamage(distanceGameUnits, PEBBLE_RADIUS_GAME, multiplier) * EXPECTED_PEBBLES;
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const arcane = getManager().getElementValue(Element.Arcane);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Doragate.spell,
      reachScreen: (PEBBLE_RADIUS_GAME + 5 + PEBBLE_SCATTER_GAME) * 6,
      impactPoint: (target, { myCenter, surface }) => {
        const center = target.getCenter();
        if (Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]) > MAX_RANGE_SCREEN) {
          return null;
        }
        if (!hasLineOfSight(surface, myCenter, center)) return null;
        return center;
      },
      predictDamageAt: (d) => Doragate.predictDamageAt(d, arcane),
      predictAllyDamageAt: (d) =>
        Doragate.predictDamageAt(Math.max(0, d - PEBBLE_SCATTER_GAME), arcane),
    });

    this.getNextEvaluation();
  }
}
