import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller } from "../../data/controller/controller";
import { Cursor } from "./types";

export class ApplyCursor implements Cursor {
  constructor(private character: Character, private spell: Spell) {}

  remove(): void {}

  tick(dt: number, controller: Controller) {
    if (!this.spell.data.applyKeys) {
      return;
    }

    for (let key of this.spell.data.applyKeys) {
      if (controller.isKeyDown(key)) {
        this.spell.data.apply(this.character);
      }
    }
  }
}
