import { DataConnection } from "peerjs";
import { Character } from "../character";
import { Controller } from "../controller/controller";
import { Level } from "../map/level";
import { NetworkController } from "../controller/networkController";
import { Team } from "../team";

export class Player {
  public readonly characters: Character[] = [];
  public active = 0;

  private _name = "";
  private _team = Team.empty();
  private _controller: Controller = new NetworkController();

  constructor(public readonly connection?: DataConnection) {}

  connect(name: string, team: Team, controller?: Controller) {
    this._name = name;
    this._team = team;

    if (controller) {
      this._controller = controller;
    }
  }

  destroy() {
    if (this.characters.length) {
      Level.instance.remove(...this.characters);
    }
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

  get name() {
    return this._name;
  }

  get team() {
    return this._team;
  }

  get controller() {
    return this._controller;
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
