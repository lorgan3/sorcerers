import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller } from "../../data/controller/controller";
import { Cursor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";

export class ApplyCursor implements Cursor {
  private applied = false;
  constructor(private character: Character, private spell: Spell) {}

  remove(): void {}

  tick(dt: number, controller: Controller) {
    if (!this.spell.data.applyKeys || this.applied) {
      return;
    }

    for (let key of this.spell.data.applyKeys) {
      if (controller.isKeyDown(key)) {
        this.applied = true;
        this.spell.data.apply(this.character);

        if (this.spell.data.turnState) {
          Manager.instance.setTurnState(TurnState.Attacked);
        }
      }
    }
  }
}
