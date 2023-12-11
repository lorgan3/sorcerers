import { DataConnection } from "peerjs";
import { Character } from "../character";
import { Controller } from "../controller/controller";
import { Level } from "../map/level";

export class Player {
  public readonly characters: Character[] = [];
  public active = 0;
  public name = "";

  constructor(
    public readonly controller: Controller,
    public readonly connection?: DataConnection
  ) {}

  destroy() {
    Level.instance.remove(...this.characters);
  }

  addCharacter(character: Character) {
    this.characters.push(character);
    Level.instance.add(character);
  }

  removeCharacter(character: Character) {
    const index = this.characters.indexOf(character);

    if (this.active === index) {
      this.active = -1;
    }
    this.characters.splice(index, 1);
    Level.instance.remove(character);
  }

  get activeCharacter() {
    return this.characters[this.active];
  }

  serialize() {
    return {
      characters: this.characters.map((character) => character.serialize()),
    };
  }

  deserialize(data: any) {
    for (let index in this.characters) {
      this.characters[index].deserialize(data.characters[index]);
    }
  }
}
