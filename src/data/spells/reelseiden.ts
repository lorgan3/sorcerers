import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Level } from "../map/level";
import { Character } from "../entity/character";
import { Server } from "../network/server";
import { EntityType, Spawnable } from "../entity/types";
import { angles, getIndexFromAngle } from "../collision/util";
import { getAngle } from "../../util/math";
import {
  rotatedRectangle2x40,
  rotatedRectangle2x40Canvas,
  rotatedRectangle4x32,
  rotatedRectangle4x32Canvas,
  rotatedRectangle6x24,
  rotatedRectangle6x24Canvas,
} from "../collision/precomputed/rectangles";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { GenericDamage } from "../damage/genericDamage";
import { TargetList } from "../damage/targetList";
import { Manager } from "../network/manager";
import { Element } from "./types";

const TOOLS = [
  {
    mask: rotatedRectangle6x24,
    canvas: rotatedRectangle6x24Canvas,
    offset: 0,
  },
  {
    mask: rotatedRectangle4x32,
    canvas: rotatedRectangle4x32Canvas,
    offset: -4,
  },
  {
    mask: rotatedRectangle2x40,
    canvas: rotatedRectangle2x40Canvas,
    offset: -8,
  },
];

export class Reelseiden extends Container implements Spawnable {
  public id = -1;
  public readonly type = EntityType.Reelseiden;

  private sprite: AnimatedSprite;

  constructor(x: number, y: number, private angleIndex: number) {
    super();
    this.position.set(x * 6, y * 6);

    this.sprite = new AnimatedSprite(
      AssetsContainer.instance.assets!["atlas"].animations["spells_slash"]
    );
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.position.set(72, 72);
    this.sprite.rotation = angles[angleIndex] + Math.PI / 2;
    this.sprite.loop = false;
    this.sprite.scale.set(3);
    this.sprite.animationSpeed = 0.2;
    this.sprite.play();
    this.sprite.onComplete = () => Level.instance.remove(this);

    this.addChild(this.sprite);

    for (let tool of TOOLS) {
      Level.instance.terrain.subtract(
        x + tool.offset,
        y + tool.offset,
        tool.mask[angleIndex],
        (ctx) => {
          ctx.drawImage(
            tool.canvas[angleIndex],
            x + tool.offset,
            y + tool.offset
          );
        }
      );
    }

    const targetList = new TargetList();

    Level.instance.withNearbyEntities(
      x * 6 + 72,
      y * 6 + 72,
      40 * 6,
      (entity) => {
        const [ex, ey] = entity.body.position;
        for (let tool of TOOLS) {
          if (
            tool.mask[angleIndex].collidesWith(
              entity.body.mask,
              ex - x - tool.offset,
              ey - y - tool.offset
            )
          ) {
            targetList.add(
              entity,
              20 *
                (0.7 + Manager.instance.getElementValue(Element.Physical) * 0.3)
            );
            return;
          }
        }
      }
    );

    if (targetList.hasEntities()) {
      Level.instance.damage(new GenericDamage(targetList));
    }

    ControllableSound.fromEntity(this, Sound.Slice);

    Level.instance.add(this);
  }

  getCenter(): [number, number] {
    return [this.position.x + 72, this.position.y + 72];
  }

  tick() {}

  serializeCreate() {
    return [this.position.x / 6, this.position.y / 6, this.angleIndex] as const;
  }

  static create(data: ReturnType<Reelseiden["serializeCreate"]>) {
    return new Reelseiden(...data);
  }

  static cast(x: number, y: number, _: null, character: Character) {
    if (!Server.instance) {
      return;
    }

    const [x2, y2] = character.getCenter();
    const angle = getAngle(x, y, x2 / 6, y2 / 6);
    const angleIndex = getIndexFromAngle(angle);

    const entity = new Reelseiden(x - 12, y - 12, angleIndex);

    Server.instance.create(entity);
    return entity;
  }
}
