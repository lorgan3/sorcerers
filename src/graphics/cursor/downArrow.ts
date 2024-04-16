import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell, getSpellCost } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";

interface TriggerData {
  xOffset: number;
  yOffset: number;
  turnState: TurnState;
  projectile: ProjectileConstructor;
  spellSource?: boolean;
}

export class ArrowDown extends Container implements Cursor<TriggerData> {
  constructor(private character: Character, private spell: Spell<TriggerData>) {
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

    if (spell.data.spellSource) {
      this.character.setSpellSource(this);
    }
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
  }

  trigger({ xOffset, yOffset, turnState, projectile }: TriggerData) {
    this.character.player.mana -= getSpellCost(this.spell);

    const position = this.character.player.controller.getMouse();
    projectile.cast(position[0] / 6 + xOffset, yOffset, this.character);

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    this.position.set(...controller.getLocalMouse());

    if (controller.isKeyDown(Key.M1)) {
      this.trigger(this.spell.data);
    }
  }

  serialize() {
    return null;
  }

  deserialize(): void {}
}
