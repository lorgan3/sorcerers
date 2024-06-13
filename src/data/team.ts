import { getWord } from "../util/word";

export class Team {
  private static defaultSize = 4;

  private constructor(public characters: string[], public size: number) {
    this.setSize(size);
  }

  serialize(): string[] {
    return this.characters;
  }

  isValid() {
    return (
      this.characters.length >= this.size &&
      this.characters.find((name) => !name.trim()) === undefined
    );
  }

  setSize(newSize?: number) {
    if (!newSize) {
      return this;
    }

    this.size = newSize;

    // Pad up to new size
    while (this.characters.length < newSize) {
      this.characters.push(getWord());
    }

    // Remove empty names past limit
    this.characters = this.characters.filter(
      (name, i) => i >= newSize || !!name.trim()
    );

    return this;
  }

  static random(size = Team.defaultSize) {
    return new Team(new Array(size).fill(null).map(getWord), size);
  }

  static fromJson(json: string[], size: number) {
    return new Team(json, size);
  }

  static empty(size = Team.defaultSize) {
    return new Team(new Array(size).fill(""), size);
  }
}
