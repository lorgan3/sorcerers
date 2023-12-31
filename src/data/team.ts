import { getWord } from "../util/word";

const CHARACTERS_PER_TEAM = 4;

export class Team {
  private constructor(public name: string, public characters: string[]) {}

  serialize(): any[] {
    return [this.name, [...this.characters]];
  }

  isValid() {
    return (
      !!this.name.trim() &&
      this.characters.length === CHARACTERS_PER_TEAM &&
      this.characters.find((name) => !name.trim()) === undefined
    );
  }

  static random() {
    return new Team(
      "Default",
      new Array(CHARACTERS_PER_TEAM).fill(null).map(getWord)
    );
  }

  static fromJson(json: any[]) {
    return new Team(json[0], json[1]);
  }

  static empty() {
    return new Team("", new Array(CHARACTERS_PER_TEAM).fill(""));
  }
}
