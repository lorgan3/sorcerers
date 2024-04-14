import { Character } from "../entity/character";
import { Server } from "../network/server";

export class MindControl {
  static cast(x: number, y: number, character: Character, _: Character) {
    if (!Server.instance) {
      return;
    }

    Server.instance.broadcastActiveCharacter(
      Server.instance.players.indexOf(character.player),
      character.player.characters.indexOf(character)
    );
  }
}
