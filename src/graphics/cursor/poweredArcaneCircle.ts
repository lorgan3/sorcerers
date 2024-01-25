import { AnimatedSprite, Container } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";

import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";
import { Level } from "../../data/map/level";

const SCALE_MULTIPLIER = 0.4;
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
}

export class PoweredArcaneCircle
  extends Container
  implements Cursor<TriggerData>
{
  private indicator: AnimatedSprite;
  private powerMeter: AnimatedSprite;

  private power = 0;
  private powerDirection = 1;

  constructor(
    private character: Character,
    private spell: Spell<PoweredArcaneCircle>
  ) {
    super();

    this.visible = false;

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.indicator = new AnimatedSprite(atlas.animations["spells_magicCircle"]);
    this.indicator.pivot.set(0, 156);
    this.indicator.anchor.set(0.5);
    this.indicator.animationSpeed = ANIMATION_SPEED;
    this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);
    this.indicator.play();

    this.powerMeter = new AnimatedSprite(atlas.animations["icons_bar"]);
    this.powerMeter.anchor.set(0.5);
    this.powerMeter.scale.set(2);
    this.powerMeter.position.set(0, 56);

    this.addChild(this.indicator, this.powerMeter);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
  }

  trigger({ projectile, xOffset, yOffset, x, y, turnState }: TriggerData) {
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
    if (!controller.isKeyDown(Key.M1)) {
      if (this.visible) {
        this.character.setSpellSource(this, false);
        this.visible = false;
        this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);

        this.trigger(this.spell.data);
      }

      return;
    }

    const [x2, y2] = this.character.getCenter();
    this.position.set(x2, y2);
    this.indicator.position.set(this.character.direction * 20, -20);
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
      this.visible = true;
      this.indicator.scale.set(
        Math.min(SCALE_MULTIPLIER, this.indicator.scale.x + 0.01 * dt)
      );
    }

    const [x, y] = controller.getMouse();
    this.indicator.rotation = Math.atan2(y - y2, x - x2) + Math.PI / 2;
  }
}
