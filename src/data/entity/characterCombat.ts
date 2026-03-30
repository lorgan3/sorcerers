import { Key } from "../controller/controller";
import { getManager } from "../context";
import type { Character } from "./character";

export class CharacterCombat {
  private spellSource: any | null = null;

  constructor(private character: Character) {}

  setSpellSource(source: any, toggle = true): void {
    if (toggle) {
      if (this.character.body.onLadder) {
        return;
      }

      this.spellSource = source;

      if (
        !this.character.isInAnimationState("SpellIdle") &&
        !this.character.player.controller.isKeyDown(Key.Left) &&
        !this.character.player.controller.isKeyDown(Key.Right) &&
        !this.character.player.controller.isKeyDown(Key.A) &&
        !this.character.player.controller.isKeyDown(Key.D)
      ) {
        this.character.animate("Spell");
      }

      this.character.setDefaultAnimation("Spell");
    } else if (!source || source === this.spellSource) {
      this.spellSource = null;

      let defaultAnimation: "Read" | "Idle";
      if (
        getManager().getActiveCharacter() === this.character &&
        this.character.player.controller.isKeyDown(Key.Inventory)
      ) {
        defaultAnimation = "Read";
      } else {
        defaultAnimation = "Idle";
      }

      if (this.character.isInAnimationState("SpellIdle")) {
        this.character.animate("SpellDone");
      } else if (this.character.isInAnimationState("Spell")) {
        this.character.animate(defaultAnimation);
      }

      this.character.setDefaultAnimation(defaultAnimation);
    }
  }

  isCasting(): boolean {
    return !!this.spellSource;
  }

  openSpellBook(): void {
    if (
      !this.spellSource &&
      !this.character.isInAnimationState("Read") &&
      !this.character.isInAnimationState("ReadIdle")
    ) {
      this.character.animate("Read");
      this.character.setDefaultAnimation("Read");
    }
  }

  melee(): void {
    this.character.animate("Swing");
  }
}
