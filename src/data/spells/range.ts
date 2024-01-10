import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Cursor, Spell } from ".";
import { Character } from "../entity/character";
import { Controller, Key } from "../controller/controller";
import { Level } from "../map/level";
import { Manager } from "../network/manager";

export class Range extends Container implements Cursor {
  indicator: Sprite;

  private initialDist = 0;
  private _power = 0;

  constructor(private character: Character, private spell: Spell) {
    super();

    this.pivot.set(-14, 32);
    this.position.set(27, 50);
    this.scale.set(2);
    this.visible = false;

    const frame =
      AssetsContainer.instance.assets!["atlas"].textures["spells_range"];

    const background = new Sprite(frame);
    background.alpha = 0.5;

    this.indicator = new Sprite(frame);

    this.addChild(background, this.indicator);
    character.addChild(this);
  }

  remove(): void {
    this.character.removeChild(this);
  }

  tick(dt: number, controller: Controller) {
    if (!controller.isKeyDown(Key.M1)) {
      this.visible = false;

      if (this._power > 0) {
        const [x, y] = this.character.body.precisePosition;
        const projectile = this.spell.data.projectile.cast(
          x +
            this.spell.data.x +
            Math.cos(this.rotation) * this.spell.data.xOffset,
          y +
            this.spell.data.y +
            Math.sin(this.rotation) * this.spell.data.yOffset,
          this.character
        );

        if (projectile) {
          if (projectile.body) {
            projectile.body.addAngularVelocity(this.power * 5, this.rotation);
          }
        }

        Manager.instance.endTurn();
        this._power = 0;
      }
    } else {
      const [x, y] = controller.getMouse();
      const point = this.parent.position;

      if (!this.visible) {
        this.visible = true;
        this.initialDist =
          Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) - 20;
      }

      this.rotation = Math.atan2(y - point.y, x - point.x);

      this._power = Math.min(
        Math.max(
          0,
          (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) -
            this.initialDist) /
            100
        ),
        1
      );

      this.indicator.scale.set(this._power);
      this.indicator.position.y = 32 * (1 - this._power);
    }
  }

  get power() {
    return this._power;
  }
}
