import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Cursor } from "./types";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";

interface TriggerData {
  applyKeys: Key[];
  apply: (character: Character) => void;
  turnState?: TurnState;
}

export class ApplyCursor implements Cursor<TriggerData> {
  private applied = false;
  constructor(
    private character: Character,
    private spell: Spell<ApplyCursor>
  ) {}

  remove(): void {}

  trigger({ apply, turnState }: TriggerData) {
    this.applied = true;
    apply(this.character);

    if (turnState) {
      Manager.instance.setTurnState(TurnState.Attacked);
    }
  }

  tick(dt: number, controller: Controller) {
    if (!this.spell.data.applyKeys || this.applied) {
      return;
    }

    for (let key of this.spell.data.applyKeys) {
      if (controller.isKeyDown(key)) {
        this.trigger(this.spell.data);
      }
    }
  }
}
