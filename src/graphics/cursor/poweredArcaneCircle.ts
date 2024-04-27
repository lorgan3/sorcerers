import { AnimatedSprite, Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";

import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";
import { Level } from "../../data/map/level";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Server } from "../../data/network/server";

const SCALE_MULTIPLIER = 0.8;
const ANIMATION_SPEED = -0.4;
const MAX_POWER = 5.49;
const MIN_POWER = -0.49;
const CHARGE_SPEED = 0.1;

interface TriggerData {
  x: number;
  y: number;
  xOffset: number;
  yOffset: number;
  turnState: TurnState;
  projectile: ProjectileConstructor;
  keepSpellSource?: boolean;
}

type State = [number, number];

export class PoweredArcaneCircle
  extends Container
  implements Cursor<TriggerData, never, State>
{
  private indicator: AnimatedSprite;
  private powerMeter: AnimatedSprite;
  private pointer: Sprite;

  private power = 0;
  private powerDirection = 1;
  private sound?: ControllableSound;

  constructor(private character: Character, private spell: Spell<TriggerData>) {
    super();

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.indicator = new AnimatedSprite(atlas.animations["spells_magicCircle"]);
    this.indicator.pivot.set(0, 78);
    this.indicator.anchor.set(0.5);
    this.indicator.animationSpeed = ANIMATION_SPEED;
    this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);
    this.indicator.play();
    this.indicator.visible = false;

    this.powerMeter = new AnimatedSprite(atlas.animations["icons_bar"]);
    this.powerMeter.anchor.set(0.5);
    this.powerMeter.scale.set(2);
    this.indicator.visible = false;

    this.pointer = new Sprite(atlas.textures["spells_pointer"]);
    this.pointer.anchor.set(0.4, 0.25);
    this.pointer.scale.set(2);

    this.addChild(this.indicator, this.powerMeter, this.pointer);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
    this.sound?.destroy();
  }

  trigger({ projectile, xOffset, yOffset, x, y, turnState }: TriggerData) {
    this.sound?.destroy();
    this.sound = undefined;

    const [px, py] = this.character.body.precisePosition;
    const rotation = this.indicator.rotation - Math.PI / 2;

    projectile.cast(
      px + x + Math.cos(rotation) * xOffset,
      py + y + Math.sin(rotation) * yOffset,
      this.character,
      this.power,
      rotation
    );

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    this.pointer.position.set(...controller.getLocalMouse());

    if (!controller.isKeyDown(Key.M1)) {
      if (this.indicator.visible) {
        if (!this.spell.data.keepSpellSource) {
          this.character.setSpellSource(this, false);
        }
        this.powerMeter.visible = false;
        this.indicator.visible = false;
        this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);

        if (Server.instance) {
          Server.instance.cast();
        }
      }

      return;
    }

    if (this.indicator.visible) {
      if (this.sound) {
        this.sound.update(this.character);
      } else {
        this.sound = ControllableSound.fromEntity(
          this.character,
          Sound.DarkMagic,
          {
            loop: true,
          }
        );
      }
    }

    const [x2, y2] = this.character.getCenter();
    this.powerMeter.position.set(x2, y2 + 56);
    this.indicator.position.set(x2 + this.character.direction * 20, y2 - 20);
    this.indicator.animationSpeed = this.character.direction * ANIMATION_SPEED;

    this.power += CHARGE_SPEED * this.powerDirection * dt;

    if (this.power >= MAX_POWER) {
      this.powerDirection = -1;
      this.power = MAX_POWER;
    } else if (this.power <= MIN_POWER) {
      this.powerDirection = 1;
      this.power = MIN_POWER;
    }

    this.powerMeter.currentFrame = Math.round(this.power);

    this.character.setSpellSource(this);

    if (this.indicator.scale.x < SCALE_MULTIPLIER) {
      this.powerMeter.visible = true;
      this.indicator.visible = true;
      this.indicator.scale.set(
        Math.min(SCALE_MULTIPLIER, this.indicator.scale.x + 0.01 * dt)
      );
    }

    const [x, y] = controller.getMouse();
    this.indicator.rotation = Math.atan2(y - y2 + 24, x - x2) + Math.PI / 2;
  }

  serialize() {
    return [this.power, this.powerDirection] as State;
  }

  deserialize(data: State): void {
    this.power = data[0];
    this.powerDirection = data[1];
  }
}
