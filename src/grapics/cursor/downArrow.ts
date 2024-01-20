import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { Manager } from "../../data/network/manager";
import { Cursor } from "./types";

export class ArrowDown extends Container implements Cursor {
  constructor(private character: Character, private spell: Spell) {
    super();

    this.pivot.set(-14, 32);
    this.position.set(27, 50);
    this.scale.set(2);

    const frame =
      AssetsContainer.instance.assets!["atlas"].textures["spells_arrowDown"];

    const indicator = new Sprite(frame);
    indicator.anchor.set(0.5);
    indicator.position.set(-13, 20);

    this.addChild(indicator);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
  }

  tick(dt: number, controller: Controller) {
    this.position.set(...controller.getLocalMouse());

    const position = controller.getMouse();
    if (controller.isKeyDown(Key.M1)) {
      this.spell.data.projectile.cast(
        position[0] / 6 + this.spell.data.xOffset,
        this.spell.data.yOffset,
        this.character
      );

      Manager.instance.setTurnState(this.spell.data.turnState);
    }
  }
}
