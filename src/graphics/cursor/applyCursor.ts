import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Cursor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";
import { Server } from "../../data/network/server";

interface TriggerData {
  applyKeys: Key[];
  apply: (character: Character) => void;
  turnState?: TurnState;
}

export class ApplyCursor implements Cursor<TriggerData> {
  private applied = false;
  constructor(
    private character: Character,
    private spell: Spell<TriggerData>
  ) {}

  remove(): void {}

  trigger({ apply, turnState }: TriggerData) {
    this.applied = true;
    apply(this.character);

    if (turnState) {
      Manager.instance.setTurnState(turnState);
    }
  }

  tick(dt: number, controller: Controller) {
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
