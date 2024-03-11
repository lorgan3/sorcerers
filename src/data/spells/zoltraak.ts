import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Character } from "../entity/character";

import {
  rotatedRectangle2x24,
  rotatedRectangle2x24Canvas,
  rotatedRectangle4x24,
  rotatedRectangle4x24Canvas,
  rotatedRectangle6x24,
  rotatedRectangle6x24Canvas,
} from "../collision/precomputed/rectangles";
import { angles, getIndexFromAngle } from "../collision/util";
import { getDistance, getRayDistance } from "../../util/math";
import { circle3x3 } from "../collision/precomputed/circles";
import { EntityType, HurtableEntity, Spawnable } from "../entity/types";
import { TargetList } from "../damage/targetList";
import { GenericDamage } from "../damage/genericDamage";
import { Server } from "../network/server";
import { Manager } from "../network/manager";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

const DAMAGE = 40;
const MAX_DISTANCE = 912;

const TOOLS = [
  {
    mask: rotatedRectangle2x24,
    canvas: rotatedRectangle2x24Canvas,
  },
  {
    mask: rotatedRectangle4x24,
    canvas: rotatedRectangle4x24Canvas,
  },
  {
    mask: rotatedRectangle6x24,
    canvas: rotatedRectangle6x24Canvas,
  },
];

export class Zoltraak extends Container implements Spawnable {
  private impact: AnimatedSprite;
  private time = 0;

  public id = -1;
  public readonly type = EntityType.Zoltraak;

  constructor(
    x: number,
    y: number,
    private angleIndex: number,
    private distance: number
  ) {
    super();
    const angle = angles[angleIndex] + Math.PI / 2;

    this.position.set(x * 6, y * 6);
    this.rotation = angle;

    // const maxI = Math.min(6, Math.ceil(distance / 6 / 24));
    const maxI = 6;

    let x2 = x - 24 * Math.cos(angle) - 10;
    let y2 = y - 24 * Math.sin(angle) - 10;

    for (let i = 0; i < maxI; i++) {
      Level.instance.terrain.subtract(
        x2,
        y2,
        TOOLS[Math.floor(i / 2)].mask[angleIndex],
        (ctx) => {
          ctx.drawImage(
            TOOLS[Math.floor(i / 2)].canvas[angleIndex],
            x2 | 0,
            y2 | 0
          );
        }
      );

      x2 -= 23 * Math.cos(angle);
      y2 -= 23 * Math.sin(angle);
    }

    Level.instance.terrain.subtractCircle(
      (x - 152 * Math.cos(angle) + 2) | 0,
      (y - 152 * Math.sin(angle) + 2) | 0,
      1.5,
      circle3x3
    );

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.impact = new AnimatedSprite(atlas.animations["impact"]);
    this.impact.position.x = -100;
    this.impact.anchor.set(0, 0.5);
    this.impact.animationSpeed = 0.3;
    this.impact.loop = false;
    this.impact.scale.set(-3);
    this.impact.play();

    this.addChild(this.impact);

    ControllableSound.fromEntity(this, Sound.Beam);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    this.time += dt;

    if (this.time > 20) {
      Level.instance.remove(this);
    }
  }

  serializeCreate() {
    return [
      this.position.x / 6,
      this.position.y / 6,
      this.angleIndex,
      this.distance,
    ] as const;
  }

  static create(data: ReturnType<Zoltraak["serializeCreate"]>) {
    return new Zoltraak(...data);
  }

  static cast(x: number, y: number, character: Character) {
    if (!Server.instance) {
      return;
    }

    const [x2, y2] = character.getCenter();
    const angle = Math.atan2(y - y2 / 6, x - x2 / 6) + Math.PI / 2;
    const angleIndex = getIndexFromAngle(angle);
    const distance = Zoltraak.getDistance(x * 6, y * 6, angle + Math.PI / 2);

    const entity = new Zoltraak(x, y, angleIndex, distance);

    Server.instance.create(entity);
    return entity;
  }

  // Get length of the beam and also apply damage.
  private static getDistance(x: number, y: number, angle: number) {
    const targets: Array<{ distance: number; entity: HurtableEntity }> = [];

    Level.instance.withNearbyEntities(
      x,
      y,
      MAX_DISTANCE,
      (entity, distance) => {
        const [cx, cy] = entity.getCenter();
        const rayDistance = getRayDistance(x, y, angle, cx, cy);

        if (rayDistance <= 48) {
          targets.push({ distance, entity });
        }
      }
    );

    targets.sort((a, b) => a.distance - b.distance);
    const targetList = new TargetList();

    let damage = DAMAGE * Manager.instance.getElementValue(Element.Arcane);
    for (let target of targets) {
      targetList.add(target.entity, damage);

      if (target.entity.hp > damage) {
        const [cx, cy] = target.entity.getCenter();

        Level.instance.damage(new GenericDamage(targetList));
        return getDistance(x, y, cx, cy);
      } else {
        damage -= target.entity.hp;
      }
    }

    if (targetList.hasEntities()) {
      Level.instance.damage(new GenericDamage(targetList));
    }

    return MAX_DISTANCE;
  }
}
