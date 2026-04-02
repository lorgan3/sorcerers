import { Character } from "../entity/character";
import { EntityType, Spawnable } from "../entity/types";
import { Bomb } from "./bomb";
import { Container } from "pixi.js";
import { TurnState } from "../network/types";
import { getLevel, getManager, getServer } from "../context";
import { map } from "../../util/math";

export class Hairpin extends Container implements Spawnable {
  private static bombCount = 3;
  private static spawnInterval = 20;

  public id = -1;
  public readonly type = EntityType.Hairpin;

  private time = 0;
  private lastSpawn = 0;
  private bombsRemaining = 0;

  constructor(
    private _x: number,
    private _y: number,
    private direction: number,
    private power: number,
    private character: Character
  ) {
    super();

    this.bombsRemaining = Hairpin.bombCount;
    character.setSpellSource(this);
  }

  tick(dt: number) {
    const server = getServer();
    if (!server) {
      return;
    }

    this.time += dt;

    if (this.time >= this.lastSpawn + Hairpin.spawnInterval) {
      this.bombsRemaining--;
      this.lastSpawn = this.time;

      const spread = map(
        Math.PI / 8,
        Math.PI / 12,
        Math.min((this.power - 1) / 6, 1)
      );

      const bomb = new Bomb(
        this._x,
        this._y,
        this.power + Math.random() - 0.5,
        this.direction + (Math.random() - 0.5) * spread,
        this.character
      );

      server.create(bomb);

      if (this.bombsRemaining === 0) {
        server.kill(this);
      }
    }
  }

  die() {
    this.character.setSpellSource(this, false);
    getLevel().remove(this);
    getManager().setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  serializeCreate() {
    return [
      this._x,
      this._y,
      this.direction,
      this.power,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<Hairpin["serializeCreate"]>) {
    return new Hairpin(
      data[0],
      data[1],
      data[2],
      data[3],
      getLevel().entityMap.get(data[4]) as Character
    );
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    const server = getServer();
    if (!server) {
      return;
    }

    const entity = new Hairpin(x, y, direction, 1 + power, character);

    server.create(entity);
    return entity;
  }
}
