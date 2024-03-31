import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Character } from "../entity/character";
import { EntityType, HurtableEntity, Spawnable } from "../entity/types";
import { TurnState } from "../network/types";
import { Manager } from "../network/manager";
import { rotatedRectangle6x24 } from "../collision/precomputed/rectangles";
import { getIndexFromAngle } from "../collision/util";
import { Server } from "../network/server";
import { TargetList } from "../damage/targetList";
import { GenericDamage } from "../damage/genericDamage";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { angleDiff } from "../../util/math";

export class WindBlast extends Container implements Spawnable {
  private static triggerFrame = 4;

  private sprite: AnimatedSprite;

  private rx = 0;
  private ry = 0;
  private triggered = false;

  public id = -1;
  public readonly type = EntityType.WindBlast;

  constructor(
    x: number,
    y: number,
    private power: number,
    private direction: number,
    private character: Character
  ) {
    super();
    character.setSpellSource(this);
    this.position.set(x * 6, y * 6);
    this.rx = Math.round(x);
    this.ry = Math.round(y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["windBlast"]);
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(character.direction * 72, 0);

    this.sprite.animationSpeed = 0.3;
    this.sprite.loop = false;
    this.sprite.rotation = direction;
    this.sprite.scale.set(3);
    this.sprite.onComplete = () => this.die();
    this.sprite.play();

    ControllableSound.fromEntity(character, Sound.Air);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(
    //     rotatedRectangle6x24Canvas[getIndexFromAngle(direction - Math.PI / 2)]
    //       .getContext("2d")!
    //       .getImageData(0, 0, 24, 24).data,
    //     24,
    //     24
    //   )
    // );
    // sprite2.alpha = 0.3;
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.position.set(character.direction === 1 ? 0 : -24 * 6, -12 * 6);

    this.addChild(this.sprite);
  }

  tick(dt: number) {
    if (!Server.instance) {
      return;
    }

    if (this.sprite.currentFrame > WindBlast.triggerFrame && !this.triggered) {
      this.triggered = true;

      const x = this.rx + (this.character.direction === 1 ? 0 : -24);
      const y = this.ry - 12;

      // Change the direction a bit upwards for a better effect (Characters have a lot of friction with the ground)
      const diff = angleDiff(this.direction, -Math.PI / 2);
      const max = Math.PI / 6;
      const adjustedDirection =
        this.direction + Math.max(-max, Math.min(max, diff));

      const entities: HurtableEntity[] = [];
      Level.instance.withNearbyEntities(x * 6, y * 6, 32 * 6, (entity) => {
        const [ex, ey] = entity.body.position;

        if (
          rotatedRectangle6x24[
            getIndexFromAngle(this.direction - Math.PI / 2)
          ].collidesWith(entity.body.mask, ex - x, ey - y)
        ) {
          entities.push(entity);
        }
      });

      const targetList = new TargetList(
        entities
          .sort((a, b) => b.position.y - a.position.y)
          .map((entity) => ({
            entityId: entity.id,
            damage: 0,
            force: {
              direction: adjustedDirection,
              power:
                this.power *
                (0.7 + Manager.instance.getElementValue(Element.Life) * 0.3),
            },
          }))
      );

      if (targetList.hasEntities()) {
        Level.instance.damage(new GenericDamage(targetList));
      }
    }
  }

  die() {
    Level.instance.remove(this);
    this.character.setSpellSource(this, false);
    Manager.instance.setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  serializeCreate() {
    return [
      this.rx,
      this.ry,
      this.power,
      this.direction,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<WindBlast["serializeCreate"]>) {
    return new WindBlast(
      data[0],
      data[1],
      data[2],
      data[3],
      Level.instance.entityMap.get(data[4]) as Character
    );
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    if (!Server.instance) {
      return;
    }

    const entity = new WindBlast(x, y, power, direction, character);

    Server.instance.create(entity);
    return entity;
  }
}
