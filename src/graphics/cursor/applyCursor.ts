import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Cursor } from "./types";
import { getLevel, getManager, getServer } from "../../data/context";
import { TurnState } from "../../data/network/types";
import { Container, Sprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

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
    this.pointer.tint = this.character.player.color;

    this.addChild(this.pointer);
    getLevel().uiContainer.addChild(this);
  }

  remove() {
    getLevel().uiContainer.removeChild(this);
  }

  trigger({ apply, turnState }: TriggerData) {
    this.applied = true;
    apply(this.character);

    if (turnState) {
      getManager().setTurnState(turnState);
    }
  }

  tick(dt: number, controller: Controller) {
    this.pointer.position.set(...controller.getLocalMouse());
    this.pointer.scale.set(2 / getLevel().viewport.scale.x);

    if (
      !this.spell.data.applyKeys ||
      this.applied ||
      this.character.body.onLadder
    ) {
      return;
    }

    const server = getServer();
    if (server) {
      for (let key of this.spell.data.applyKeys) {
        if (controller.isKeyDown(key)) {
          server.cast();
        }
      }
    }
  }

  serialize() {
    return null;
  }

  deserialize(): void {}
}
