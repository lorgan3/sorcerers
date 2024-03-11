import { Level } from "../map/level";
import { Character } from "../entity/character";
import { EntityType, Spawnable } from "../entity/types";
import { Server } from "../network/server";
import { Bomb } from "./bomb";
import { Container } from "pixi.js";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
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
    if (!Server.instance) {
      return;
    }

    this.time += dt;

    if (this.time >= this.lastSpawn + Hairpin.spawnInterval) {
      this.bombsRemaining--;
      this.lastSpawn = this.time;

      const spread = map(
        Math.PI / 3,
        Math.PI / 10,
        Math.min((this.power - 1) / 3, 1)
      );

      const bomb = new Bomb(
        this._x,
        this._y,
        this.power + Math.random() - 0.5,
        this.direction + (Math.random() - 0.5) * spread
      );

      Server.instance.create(bomb);

      if (this.bombsRemaining === 0) {
        Server.instance.kill(this);
      }
    }
  }

  die() {
    this.character.setSpellSource(this, false);
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);
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
      Level.instance.entityMap.get(data[4]) as Character
    );
  }

  static cast(x: number, y: number, character: Character, power: number) {
    if (!Server.instance) {
      return;
    }

    const [x2, y2] = character.getCenter();
    const direction = Math.atan2(y - y2 / 6, x - x2 / 6);

    const entity = new Hairpin(x, y, direction, 1 + power / 2, character);

    Server.instance.create(entity);
    return entity;
  }
}
