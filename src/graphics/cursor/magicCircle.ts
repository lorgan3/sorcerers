import { AnimatedSprite, Container } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell, getSpellCost } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";

import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";
import { Level } from "../../data/map/level";

const SCALE_MULTIPLIER = 0.4;
const ANIMATION_SPEED = -0.4;

interface TriggerData {
  projectile: ProjectileConstructor;
  xOffset: number;
  yOffset: number;
  x: number;
  y: number;
  turnState: TurnState;
}

export class ArcaneCircle extends Container implements Cursor<TriggerData> {
  private indicator: AnimatedSprite;

  constructor(
    private character: Character,
    private spell: Spell<ArcaneCircle>
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

    this.addChild(this.indicator);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
  }

  trigger({ projectile, xOffset, yOffset, x, y, turnState }: TriggerData) {
    this.character.player.mana -= getSpellCost(this.spell);

    const [px, py] = this.character.body.precisePosition;
    projectile.cast(
      px + x + Math.cos(this.indicator.rotation - Math.PI / 2) * xOffset,
      py + y + Math.sin(this.indicator.rotation - Math.PI / 2) * yOffset,
      this.character
    );

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    const [x2, y2] = this.character.getCenter();
    this.position.set(x2, y2);
    this.indicator.position.set(this.character.direction * 20, -20);
    this.indicator.animationSpeed = this.character.direction * ANIMATION_SPEED;

    if (!controller.isKeyDown(Key.M1)) {
      if (this.visible) {
        this.character.setSpellSource(this, false);
        this.visible = false;
        this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);

        this.trigger(this.spell.data);
      }

      return;
    }

    this.character.setSpellSource(this);
    const [x, y] = controller.getMouse();

    if (this.indicator.scale.x < SCALE_MULTIPLIER) {
      this.visible = true;
      this.indicator.scale.set(
        Math.min(SCALE_MULTIPLIER, this.indicator.scale.x + 0.01 * dt)
      );
    }

    this.indicator.rotation = Math.atan2(y - y2, x - x2) + Math.PI / 2;
  }
}
