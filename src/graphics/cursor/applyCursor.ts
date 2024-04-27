import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Cursor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";
import { Server } from "../../data/network/server";
import { Container, Sprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Level } from "../../data/map/level";

interface TriggerData {
  applyKeys: Key[];
  apply: (character: Character) => void;
  turnState?: TurnState;
}

export class ApplyCursor extends Container implements Cursor<TriggerData> {
  private pointer: Sprite;
  private applied = false;

  constructor(private character: Character, private spell: Spell<TriggerData>) {
    super();

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.pointer = new Sprite(atlas.textures["spells_pointer"]);
    this.pointer.anchor.set(0.4, 0.25);
    this.pointer.scale.set(2);

    this.addChild(this.pointer);
    Level.instance.uiContainer.addChild(this);
  }

  remove() {
    Level.instance.uiContainer.removeChild(this);
  }

  trigger({ apply, turnState }: TriggerData) {
    this.applied = true;
    apply(this.character);

    if (turnState) {
      Manager.instance.setTurnState(turnState);
    }
  }

  tick(dt: number, controller: Controller) {
    this.pointer.position.set(...controller.getLocalMouse());

    if (!this.spell.data.applyKeys || this.applied) {
      return;
    }

    if (Server.instance) {
      for (let key of this.spell.data.applyKeys) {
        if (controller.isKeyDown(key)) {
          Server.instance.cast();
        }
      }
    }
  }

  serialize() {
    return null;
  }

  deserialize(): void {}
}
