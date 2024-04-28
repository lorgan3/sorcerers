import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";
import { Server } from "../../data/network/server";

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
    indicator.tint = this.character.player.color;

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
    const position = this.character.player.controller.getMouse();
    projectile.cast(position[0] / 6 + xOffset, yOffset, this.character);

    Manager.instance.setTurnState(turnState);
  }

  tick(dt: number, controller: Controller) {
    this.position.set(...controller.getLocalMouse());
    this.scale.set(2 / Level.instance.viewport.scale.x);

    if (Server.instance && controller.isKeyDown(Key.M1)) {
      Server.instance.cast();
    }
  }

  serialize() {
    return null;
  }

  deserialize(): void {}
}
