import { Character } from "../entity/character";
import { getLevel } from "../context";

export class Cluster {
  constructor(private characters: Character[]) {}

  get position() {
    return this.characters[0].body.precisePosition;
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
