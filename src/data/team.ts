import { getWord } from "../util/word";

const CHARACTERS_PER_TEAM = 4;

export class Team {
  private constructor(public characters: string[]) {}

  serialize(): string[] {
    return this.characters;
  }

  isValid() {
    return (
      this.characters.length === CHARACTERS_PER_TEAM &&
      this.characters.find((name) => !name.trim()) === undefined
    );
  }

  static random() {
    return new Team(new Array(CHARACTERS_PER_TEAM).fill(null).map(getWord));
  }

  static fromJson(json: string[]) {
    return new Team(json);
  }

  static empty() {
    return new Team(new Array(CHARACTERS_PER_TEAM).fill(""));
  }
}
