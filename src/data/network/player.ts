import { DataConnection } from "peerjs";
import { Character } from "../character";
import { Controller } from "../controller/controller";
import { Level } from "../map/level";
import { NetworkController } from "../controller/networkController";
import { Team } from "../team";
import { Spell } from "../spells";

export class Player {
  public readonly characters: Character[] = [];
  public active = 0;

  private _name = "";
  private _team = Team.empty();
  private _color = "";
  private _controller: Controller = new NetworkController();

  public selectedSpell: Spell | null = null;

  public resolveReady!: () => void;
  public readonly ready = new Promise<void>(
    (resolve) => (this.resolveReady = resolve)
  );

  constructor(public readonly connection?: DataConnection) {}

  connect(name: string, team: Team, color: string, controller?: Controller) {
    this._name = name;
    this._team = team;
    this._color = color;

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

  get color() {
    return this._color;
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

  rename(newName: string) {
    this._name = newName;
  }
}
