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

const BLAST_RADIUS_GAME = 16;
const LOOKAHEAD_GAME = 40;
const MAX_RANGE_SCREEN = 1500;
const SAFETY_TIMEOUT = 600; // ticks; bail if the missile never reports gone
// Screen-px vector length used to turn a steering heading into a mouse position —
// long enough that the missile tracks the angle, not the cursor's distance.
const AIM_PROJECTION_SCREEN = 300;
// target.centerScreen is the foot center (≈ ground level for a grounded character).
// Aim at the body instead so the missile flies above the terrain and strikes the
// enemy's body, rather than nosediving into the ground at our own feet. Empirical.
const AIM_LIFT_PIXELS = 24;

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

  execute(dt: number): Command[] | null {
    this.castTime += dt;
    const surface = getLevel().terrain.collisionMask;
    const [targetX, footY] = this.evaluation!.target.centerScreen;
    const targetY = footY - AIM_LIFT_PIXELS;

    if (!this.fired) {
      this.fired = true;
      return [
        { type: CommandType.ResetKeys },
        { type: CommandType.MouseMove, x: targetX, y: targetY },
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
    const heading = chooseGuidanceHeading(
      surface,
      [mx / 6, my / 6],
      [targetX / 6, targetY / 6],
      LOOKAHEAD_GAME,
    );
    const aimX = mx + Math.cos(heading) * AIM_PROJECTION_SCREEN;
    const aimY = my + Math.sin(heading) * AIM_PROJECTION_SCREEN;
    return [
      { type: CommandType.MouseMove, x: aimX, y: aimY },
      { type: CommandType.KeyDown, key: Key.M1 },
    ];
  }
}
