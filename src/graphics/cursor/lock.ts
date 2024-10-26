import { AnimatedSprite, Container } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { HurtableEntity } from "../../data/entity/types";
import { Cursor, ProjectileConstructor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";
import { Server } from "../../data/network/server";

export enum Target {
  Any,
  Solid,
  Free,
  Entity,
  Character,
  Ally,
}

const ANIMATION_SPEED = 0.2;

interface TriggerData {
  target: Target;
  projectile: ProjectileConstructor;
  turnState: TurnState;
  spellSource?: boolean;
}

interface TriggerState {
  id?: number;
}

export class Lock
  extends Container
  implements Cursor<TriggerData, TriggerState, boolean>
{
  private locked = false;
  private entity: HurtableEntity | null = null;

  private indicator: AnimatedSprite;

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
    this.indicator.tint = this.character.player.color;

    this.addChild(this.indicator);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
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

  private getPosition(): [number, number] {
    const position = this.character.player.controller.getMouse();

    switch (this.spell.data.target) {
      case Target.Solid:
        return [Math.ceil(position[0] / 6), Math.floor(position[1] / 6)];

      case Target.Free:
        return [
          Math.round(position[0] / 6) - 3,
          Math.round(position[1] / 6) - 8,
        ];
    }

    return [Math.round(position[0] / 6), Math.round(position[1] / 6)];
  }

  trigger({ projectile, turnState }: TriggerData, { id }: TriggerState) {
    const entity = id
      ? (Level.instance.entityMap.get(id) as HurtableEntity)
      : null;

    const position = this.getPosition();
    projectile.cast(...position, entity, this.character);

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    this.position.set(...controller.getLocalMouse());
    this.scale.set(2 / Level.instance.viewport.scale.x);

    if (this.spell.data.spellSource) {
      this.character.setSpellSource(this);
    }

    if (!Server.instance) {
      return;
    }

    if (this.character.body.onLadder) {
      this.animate(false);
      return;
    }

    const position = this.getPosition();
    switch (this.spell.data.target) {
      case Target.Any:
        this.animate(true);
        break;

      case Target.Solid:
        this.animate(
          Level.instance.terrain.characterMask.collidesWithPoint(...position)
        );
        break;

      case Target.Free:
        this.animate(
          !Level.instance.terrain.characterMask.collidesWith(
            this.character.body.mask,
            ...position
          )
        );
        break;

      case Target.Entity:
        this.entity = null;
        Level.instance.withNearbyEntities(
          position[0] * 6,
          position[1] * 6,
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
          position[0] * 6,
          position[1] * 6,
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

      case Target.Ally:
        this.entity = null;
        Level.instance.withNearbyEntities(
          position[0] * 6,
          position[1] * 6,
          16,
          (entity: HurtableEntity) => {
            if (
              entity instanceof Character &&
              entity !== this.character &&
              entity.player === this.character.player
            ) {
              this.entity = entity;
              return true;
            }
          }
        );

        this.animate(!!this.entity);
        break;
    }

    if (controller.isKeyDown(Key.M1) && this.locked) {
      const triggerState: TriggerState = { id: this.entity?.id };

      Server.instance.cast(triggerState);
    }
  }

  serialize() {
    return this.locked;
  }

  deserialize(locked: boolean) {
    this.animate(locked);
  }
}
