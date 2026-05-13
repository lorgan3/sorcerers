import { Character } from "../entity/character";
import { getLevel } from "../context";

export class Cluster {
  constructor(private characters: Character[]) {}

  get position() {
    return this.characters[0].body.precisePosition;
  }

  /**
   * Screen-pixel center of the primary character. Use this for mouse aim —
   * the cursor's atan2 angle computation expects mouse coords in the same
   * screen-px space as the character's center.
   */
  get centerScreen(): [number, number] {
    return this.characters[0].getCenter();
  }

  static onCharacter(character: Character, range?: number) {
    if (!range) {
      return new Cluster([character]);
    }

    const characters: Array<[Character, number]> = [];
    getLevel().withNearbyEntities(
      ...character.getCenter(),
      range,
      (entity, distanceSquared) => {
        if (entity instanceof Character) {
          characters.push([entity, distanceSquared]);
        }
      }
    );

    return new Cluster(
      characters.sort((a, b) => a[1] - b[1]).map(([character]) => character)
    );
  }
}
