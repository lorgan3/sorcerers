import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell, getSpellCost } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";

interface TriggerData {
  x: number;
  y: number;
  xOffset: number;
  yOffset: number;
  turnState: TurnState;
  projectile: ProjectileConstructor;
}

export class Range extends Container implements Cursor<TriggerData> {
  indicator: Sprite;

  private initialDist = 0;
  private _power = 0;

  constructor(private character: Character, private spell: Spell<Range>) {
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
    this.character.setSpellSource(this, false);
  }

  trigger({ x, y, xOffset, yOffset, turnState, projectile }: TriggerData) {
    this.character.player.mana -= getSpellCost(this.spell);

    const [px, py] = this.character.body.precisePosition;
    projectile.cast(
      px + x + Math.cos(this.rotation) * xOffset,
      py + y + Math.sin(this.rotation) * yOffset,
      this.character,
      this.power,
      this.rotation
    );

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    if (!controller.isKeyDown(Key.M1)) {
      this.character.setSpellSource(this, false);
      this.visible = false;

      if (this._power > 0) {
        this.trigger(this.spell.data);
        this._power = 0;
      }
    } else {
      this.character.setSpellSource(this);
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
