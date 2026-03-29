import { Character } from "../entity/character";
import { getLevel, getServer } from "../context";

export class MindControl {
  static cast(x: number, y: number, character: Character, _: Character) {
    if (!getServer()) {
      return;
    }

    getServer()!.broadcastActiveCharacter(
      getServer()!.players.indexOf(character.player),
      character.player.characters.indexOf(character)
    );
    getLevel().cameraTarget.setTarget(character);
  }
}
