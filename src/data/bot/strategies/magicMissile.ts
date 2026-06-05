import { Command, CommandType, Key } from "../../controller/controller";
import { MAGIC_MISSILE } from "../../spells";
import { getLevel, getManager } from "../../context";
import { Character } from "../../entity/character";
import { EntityType, isSpawnableEntity, Spawnable } from "../../entity/types";
import { Element } from "../../spells/types";
import { Cluster } from "../cluster";
import { Graph } from "../graph";
import { Evaluation } from "./strategy";
import { RangedStrategy } from "./rangedStrategy";
import {
  collectAllies,
  predictExplosiveDamage,
  scoreAOECandidate,
} from "./scoring";
import { chooseGuidanceHeading } from "./guidanceHeading";

const BLAST_RADIUS_GAME = 16;
const LOOKAHEAD_GAME = 40;
const MAX_RANGE_SCREEN = 1500;
const SAFETY_TIMEOUT = 600; // ticks; bail if the missile never reports gone
// Screen-px vector length used to turn a steering heading into a mouse position —
// long enough that the missile tracks the angle, not the cursor's distance.
const AIM_PROJECTION_SCREEN = 300;

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
    const myCenter = this.character.getCenter();
    const myNode = graph.getClosestNode(...this.character.bodyFootCenter);
    const currentMana = this.character.player.mana;
    const arcane = getManager().getElementValue(Element.Arcane);

    const everyone: Character[] = [];
    getLevel().withNearbyEntities(
      myCenter[0],
      myCenter[1],
      MAX_RANGE_SCREEN,
      (entity) => {
        if (entity instanceof Character) everyone.push(entity);
      },
    );
    const allies = collectAllies(this.character, everyone);

    // No LOS check — the missile steers around terrain, so range alone gates viability.
    this.evaluations = targets
      .slice(0, 3)
      .map((target) => {
        const targetCenter = target.getCenter();
        const dx = targetCenter[0] - myCenter[0];
        const dy = targetCenter[1] - myCenter[1];
        if (Math.sqrt(dx * dx + dy * dy) > MAX_RANGE_SCREEN) return null;

        const impactXGame = targetCenter[0] / 6;
        const impactYGame = targetCenter[1] / 6;
        const predict = (c: Character) => {
          const [sx, sy] = c.getCenter();
          const d = Math.sqrt(
            (sx / 6 - impactXGame) ** 2 + (sy / 6 - impactYGame) ** 2,
          );
          return MagicMissile.predictDamageAt(d, arcane);
        };

        const value = scoreAOECandidate({
          target,
          allies,
          predictDamage: predict,
          spell: MagicMissile.spell,
          currentMana,
        });
        if (value === null) return null;

        return { target: Cluster.onCharacter(target), value, to: [myNode] };
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as Evaluation[];

    this.getNextEvaluation();
  }

  private fired = false;
  private castTime = 0;

  private findMissile(): Spawnable | null {
    let found: Spawnable | null = null;
    getLevel().entities.forEach((entity) => {
      if (isSpawnableEntity(entity) && entity.type === EntityType.MagicMissile) {
        found = entity;
      }
    });
    return found;
  }

  execute(dt: number): Command[] | null {
    this.castTime += dt;
    const surface = getLevel().terrain.collisionMask;
    const [targetX, targetY] = this.evaluation!.target.centerScreen;

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
