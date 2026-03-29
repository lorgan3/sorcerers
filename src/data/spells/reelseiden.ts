import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Character } from "../entity/character";
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
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";

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

    // @TODO: re add animation if ever enabling this spell again
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
    this.sprite.onComplete = () => getLevel().remove(this);

    this.addChild(this.sprite);

    for (let tool of TOOLS) {
      getLevel().terrain.subtract(
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

    getLevel().withNearbyEntities(
      x * 6 + 72,
      y * 6 + 72,
      28 * 6,
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
                (0.7 + getManager().getElementValue(Element.Physical) * 0.3)
            );
            return;
          }
        }
      }
    );

    if (targetList.hasEntities()) {
      getServer()?.damage(
        new GenericDamage(targetList),
        getServer()!.getActivePlayer()
      );
    }

    ControllableSound.fromEntity(this, Sound.Slice);

    getLevel().add(this);
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

  static cast(
    x: number,
    y: number,
    _: null,
    character: Character,
    angle: number
  ) {
    if (!getServer()) {
      return;
    }

    const angleIndex = getIndexFromAngle(angle);
    const entity = new Reelseiden(x - 12, y - 12, angleIndex);

    getServer()!.create(entity);
    return entity;
  }
}
