import { ACID } from "../../spells";
import { AcidSpray } from "../../spells/acidSpray";
import { Command, CommandType } from "../../controller/controller";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { Element } from "../../spells/types";
import { Graph } from "../graph";
import { InstantPressCast } from "./instantPressCast";
import { predictFallDamage } from "./scoring";
import { evaluateAOECandidates } from "./aoeEvaluation";
import { chooseBallisticHeading } from "./ballistics";

// 90 = Acid shape's range in screen px (fallDamage.ts); ÷6 → game units.
const ACID_RANGE_GAME = 90 / 6;
const PER_DROPLET_BASE = 3;
// Of the ~10 droplets over the spray, a few land near a stationary target.
// Conservative starting value — refine during playtesting.
const EXPECTED_DROPLETS = 4;
const MIN_RANGE_SCREEN = 80;
// Droplet ballistics — match AcidSpray.dropletSpeed and AcidDroplet's gravity.
const DROPLET_SPEED = 1.8;
const DROPLET_GRAVITY = 0.04;
const DROPLET_TIMEOUT = 200;
// The spray leaves the staff tip, not the body center (see AcidSpray.getStaffTip).
const STAFF_FORWARD_GAME = 56 / 6;
const STAFF_LIFT_GAME = 23 / 6;
// Landing must be within splash range of the target, with margin for spray spread.
const MAX_LANDING_MISS_GAME = ACID_RANGE_GAME;
const AIM_PROJECTION_SCREEN = 300;

interface BallisticAim {
  heading: number;
  landingGame: [number, number];
}

export class Acid extends InstantPressCast {
  public static spell = ACID;

  // Keep the ballistic aim held until our spray entity is gone — the spray
  // re-reads the mouse every tick for its full ~130-tick duration.
  protected afterPress(castTime: number): Command[] | null {
    // Give the cast a few ticks to spawn the spray before checking liveness.
    if (castTime > 10 && !this.sprayAlive()) return null;
    if (castTime > 300) return null;
    const [x, y] = this.aimPoint();
    return [{ type: CommandType.MouseMove, x, y }];
  }

  private sprayAlive(): boolean {
    let found = false;
    getLevel().entities.forEach((entity) => {
      if (entity instanceof AcidSpray && entity.owner === this.character) {
        found = true;
      }
    });
    return found;
  }

  protected aimPoint(): [number, number] {
    const [cx, cy] = this.character.getCenter();
    const aim = this.solveAim(this.evaluation!.target.centerScreen);
    // The evaluation only accepted ballistically reachable targets, so aim is
    // present; fall back to the raw target just in case the bot moved.
    const heading = aim
      ? aim.heading
      : Math.atan2(
          this.evaluation!.target.centerScreen[1] - cy,
          this.evaluation!.target.centerScreen[0] - cx,
        );
    return [
      cx + Math.cos(heading) * AIM_PROJECTION_SCREEN,
      cy + Math.sin(heading) * AIM_PROJECTION_SCREEN,
    ];
  }

  static predictDamageAt(distanceGameUnits: number, lifeValue: number): number {
    const perDroplet = PER_DROPLET_BASE + lifeValue;
    return predictFallDamage(distanceGameUnits, ACID_RANGE_GAME, perDroplet) * EXPECTED_DROPLETS;
  }

  // The heading + landing spot that brings the spray closest to `targetScreen`,
  // picked across both ballistic roots so the spray's ±spread loses as few
  // droplets as possible to a landing that is merely "within splash range".
  private solveAim(targetScreen: [number, number]): BallisticAim | null {
    const surface = getLevel().terrain.collisionMask;
    const [cx, cy] = this.character.getCenter();
    const facing = Math.sign(targetScreen[0] - cx) || 1;
    const staff: [number, number] = [
      cx / 6 + facing * STAFF_FORWARD_GAME,
      cy / 6 - STAFF_LIFT_GAME,
    ];

    return chooseBallisticHeading(
      surface,
      staff,
      [targetScreen[0] / 6, targetScreen[1] / 6],
      DROPLET_SPEED,
      DROPLET_GRAVITY,
      DROPLET_TIMEOUT,
      MAX_LANDING_MISS_GAME,
    );
  }

  evaluate(graph: Graph, targets: Character[]) {
    this.graph = graph;
    const life = getManager().getElementValue(Element.Life);

    this.evaluations = evaluateAOECandidates(this.character, graph, targets, {
      spell: Acid.spell,
      reachScreen: ACID_RANGE_GAME * 6,
      impactPoint: (target, { myCenter }) => {
        const center = target.getCenter();
        const distance = Math.hypot(center[0] - myCenter[0], center[1] - myCenter[1]);
        if (distance < MIN_RANGE_SCREEN) return null;
        const aim = this.solveAim(center);
        if (!aim) return null;
        return [aim.landingGame[0] * 6, aim.landingGame[1] * 6];
      },
      predictDamageAt: (d) => Acid.predictDamageAt(d, life),
    });

    this.getNextEvaluation();
  }
}
