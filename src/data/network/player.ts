import { DataConnection } from "peerjs";
import { Character } from "../entity/character";
import { Controller } from "../controller/controller";
import { Level } from "../map/level";
import { NetworkController } from "../controller/networkController";
import { Team } from "../team";
import { Spell } from "../spells";
import { MANA_BASE_GAIN, MAX_MANA } from "./constants";

export class Player {
  public readonly characters: Character[] = [];
  public active = 0;

  private _name = "";
  private _team = Team.empty();
  private _color = "";
  private _controller: Controller = new NetworkController();
  private _mana = 0;
  private turn = 0;

  public selectedSpell: Spell | null = null;

  public resolveReady!: () => void;
  public ready = new Promise<void>((resolve) => (this.resolveReady = resolve));

  constructor(private _connection?: DataConnection) {}

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
    if (index <= this.active) {
      this.active--;
    }

    if (this.active >= this.characters.length || this.active < 0) {
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

  rename(newName: string) {
    this._name = newName;
  }

  get connection() {
    return this._connection;
  }

  disconnect() {
    this._connection = undefined;
    this.ready = new Promise<void>((resolve) => (this.resolveReady = resolve));
  }

  reconnect(connection: DataConnection) {
    if (this._connection) {
      throw new Error(`Player ${this._name} is still connected!`);
    }

    this._connection = connection;
  }

  get mana() {
    return this._mana;
  }

  set mana(value: number) {
    const oldMana = this._mana;
    this._mana = Math.min(value, MAX_MANA);

    const diff = this._mana - oldMana;
    if (diff > 0) {
      Level.instance.numberContainer.mana(
        diff,
        ...this.activeCharacter.getCenter()
      );
    }
  }

  nextTurn() {
    this.turn++;
    this.mana += MANA_BASE_GAIN;
    this._controller.resetKeys();
  }
}
