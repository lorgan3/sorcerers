import { AnimatedSprite, Container } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";

import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";

const SCALE_MULTIPLIER = 0.4;

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

    this.pivot.set(0, 100);
    this.position.set(27, 40);
    this.visible = false;

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.indicator = new AnimatedSprite(atlas.animations["spells_magicCircle"]);
    this.indicator.anchor.set(0.5);
    this.indicator.animationSpeed = 0.4;
    this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);
    this.indicator.play();

    this.addChild(this.indicator);
    character.addChild(this);
  }

  remove(): void {
    this.character.removeChild(this);
    this.character.setSpellSource(this, false);
  }

  trigger({ projectile, xOffset, yOffset, x, y, turnState }: TriggerData) {
    const [px, py] = this.character.body.precisePosition;
    projectile.cast(
      px + x + Math.cos(this.rotation - Math.PI / 2) * xOffset,
      py + y + Math.sin(this.rotation - Math.PI / 2) * yOffset,
      this.character
    );

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    const [x2, y2] = this.character.getCenter();

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
        Math.min(SCALE_MULTIPLIER, this.indicator.scale.x + 0.03 * dt)
      );
    }

    this.rotation = Math.atan2(y - y2, x - x2) + Math.PI / 2;
  }
}
