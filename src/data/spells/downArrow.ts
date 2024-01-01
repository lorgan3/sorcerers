import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Cursor, Spell } from ".";
import { Character } from "../entity/character";
import { Controller, Key } from "../controller/controller";
import { Level } from "../map/level";
import { Manager } from "../network/manager";

export class ArrowDown extends Container implements Cursor {
  constructor(private character: Character, private spell: Spell) {
    super();

    this.pivot.set(-14, 32);
    this.position.set(27, 50);
    this.scale.set(2);

    const frame =
      AssetsContainer.instance.assets!["atlas"].textures[
        "spells_arrowDown.png"
      ];

    const indicator = new Sprite(frame);
    indicator.anchor.set(0.5);
    indicator.position.set(-13, 20);

    this.addChild(indicator);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
  }

  update(controller: Controller) {
    const position = controller.getMouse();
    this.position.set(...position);

    if (controller.isKeyDown(Key.M1)) {
      const projectile = new this.spell.data.projectile(
        position[0] / 6 + this.spell.data.xOffset,
        this.spell.data.yOffset
      );
      Level.instance.add(projectile);

      Manager.instance.endTurn();
    }
  }
}
