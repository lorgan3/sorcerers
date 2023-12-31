import { AnimatedSprite, Container, DisplayObject } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Cursor, Projectile, Spell } from ".";
import { Character } from "../character";
import { Controller, Key } from "../controller/controller";
import { Level } from "../map/level";
import { Manager } from "../network/manager";
import { HurtableEntity } from "../map/types";

export enum Target {
  Any,
  Solid,
  Free,
  Entity,
  Character,
}

const ANIMATION_SPEED = 0.2;

export class Lock extends Container implements Cursor {
  private locked = false;
  private entity: HurtableEntity | null = null;

  private indicator: AnimatedSprite;
  private projectile: DisplayObject | null = null;

  constructor(character: Character, private spell: Spell) {
    super();

    this.pivot.set(-14, 32);
    this.position.set(27, 50);
    this.scale.set(2);

    const frames =
      AssetsContainer.instance.assets!["atlas"].animations["spells_lock"];

    this.indicator = new AnimatedSprite(frames);
    this.indicator.loop = false;
    this.indicator.anchor.set(0.5);
    this.indicator.position.set(-14, 32);

    this.addChild(this.indicator);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);

    if (this.projectile) {
      Level.instance.remove(this.projectile);
    }
  }

  animate(newLocked: boolean) {
    if (newLocked === this.locked) {
      return;
    }

    this.locked = newLocked;
    this.indicator.animationSpeed = newLocked
      ? ANIMATION_SPEED
      : -ANIMATION_SPEED;

    this.indicator.play();
  }

  update(controller: Controller) {
    if (!this.visible) {
      return;
    }

    const position = controller.getMouse();
    this.position.set(...position);

    switch (this.spell.data.target) {
      case Target.Any:
        this.animate(true);
        break;

      case Target.Solid:
        this.animate(
          Level.instance.terrain.characterMask.collidesWithPoint(
            Math.ceil(position[0] / 6),
            Math.floor(position[1] / 6)
          )
        );
        break;

      case Target.Free:
        this.animate(
          !Level.instance.terrain.characterMask.collidesWithPoint(
            Math.ceil(position[0] / 6),
            Math.floor(position[1] / 6)
          )
        );
        break;

      case Target.Entity:
        this.entity = null;
        Level.instance.withNearbyEntities(
          ...position,
          16,
          (entity: HurtableEntity) => {
            this.entity = entity;
            return true;
          }
        );

        this.animate(!!this.entity);
        break;

      case Target.Character:
        this.entity = null;
        Level.instance.withNearbyEntities(
          ...position,
          16,
          (entity: HurtableEntity) => {
            if (entity instanceof Character) {
              this.entity = entity;
              return true;
            }
          }
        );

        this.animate(!!this.entity);
        break;
    }

    if (controller.isKeyDown(Key.M1) && this.locked) {
      this.projectile = new this.spell.data.projectile(
        position[0] / 6,
        position[1] / 6,
        this.entity,
        controller
      );
      Level.instance.add(this.projectile!);
      this.visible = false;
    }
  }
}
