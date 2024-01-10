import { AnimatedSprite, Container } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Cursor, Spell } from ".";
import { Character } from "../entity/character";
import { Controller, Key } from "../controller/controller";

import { Manager } from "../network/manager";

const SCALE_MULTIPLIER = 0.5;

export class ArcaneCircle extends Container implements Cursor {
  private indicator: AnimatedSprite;

  constructor(private character: Character, private spell: Spell) {
    super();

    this.pivot.set(0, 100);
    this.position.set(27, 40);
    this.visible = false;

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.indicator = new AnimatedSprite(
      atlas.animations["spells_arcaneCircle"]
    );
    this.indicator.anchor.set(0.5);
    this.indicator.animationSpeed = 0.1;
    this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);
    this.indicator.play();

    this.addChild(this.indicator);
    character.addChild(this);
  }

  remove(): void {
    this.character.removeChild(this);
  }

  tick(dt: number, controller: Controller) {
    const [x2, y2] = this.character.getCenter();

    if (!controller.isKeyDown(Key.M1)) {
      if (this.visible) {
        this.visible = false;
        this.indicator.scale.set(0.1 * SCALE_MULTIPLIER);

        const [x, y] = this.character.body.precisePosition;
        this.spell.data.projectile.cast(
          x +
            this.spell.data.x +
            Math.cos(this.rotation - Math.PI / 2) * this.spell.data.xOffset,
          y +
            this.spell.data.y +
            Math.sin(this.rotation - Math.PI / 2) * this.spell.data.yOffset,
          this.character
        );

        Manager.instance.endTurn();
      }

      return;
    }

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
