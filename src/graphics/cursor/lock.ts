import { AnimatedSprite, Container, DisplayObject } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell, getSpellCost } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { HurtableEntity } from "../../data/entity/types";
import { Cursor, ProjectileConstructor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";

export enum Target {
  Any,
  Solid,
  Free,
  Entity,
  Character,
}

const ANIMATION_SPEED = 0.2;

interface TriggerData {
  target: Target;
  projectile: ProjectileConstructor;
  turnState: TurnState;
}

export class Lock extends Container implements Cursor<TriggerData> {
  private locked = false;
  private entity: HurtableEntity | null = null;

  private indicator: AnimatedSprite;
  private projectile: DisplayObject | null = null;

  constructor(private character: Character, private spell: Spell<TriggerData>) {
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

  trigger({ projectile, turnState }: TriggerData) {
    this.character.player.mana -= getSpellCost(this.spell);

    const position = this.character.player.controller.getMouse();

    projectile.cast(
      Math.round(position[0] / 6),
      Math.round(position[1] / 6),
      this.entity,
      this.character
    );

    this.visible = false;
    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    if (!this.visible) {
      return;
    }

    this.position.set(...controller.getLocalMouse());
    const position = controller.getMouse();

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
          20,
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
      this.trigger(this.spell.data);
    }
  }
}
