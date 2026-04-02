import { Container } from "pixi.js";
import { Character } from "../entity/character";
import { TurnState } from "../network/types";
import { EntityType, Spawnable } from "../entity/types";
import { getLevel, getManager, getServer } from "../context";
import { probeX } from "../map/utils";
import { IceWall } from "./iceWall";
import { Element } from "./types";

export class IceWallSpawner extends Container implements Spawnable {
  private static wallCount = 6;
  private static wallDistance = 8;
  private static maxHeightDiff = 36;
  private static startDistance = 9;
  private static spawnInterval = 20;

  public id = -1;
  public readonly type = EntityType.IceWallSpawner;

  private time = 0;
  private _x = 0;
  private _y = 0;
  private direction = 1;
  private wallCount = 0;

  constructor(x: number, y: number, private character: Character) {
    super();
    character.setSpellSource(this);
    this.wallCount =
      IceWallSpawner.wallCount +
      Math.round(getManager().getElementValue(Element.Elemental) * 3 - 2.5);

    this.direction = character.direction;
    this._x = x + this.direction * IceWallSpawner.startDistance;
    this._y = y;
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    const server = getServer();
    if (!server) {
      return;
    }

    this.time += dt;

    if (this.time > IceWallSpawner.spawnInterval) {
      this.time = 0;

      const y = probeX(
        getLevel().terrain.collisionMask,
        this._x,
        this._y - IceWallSpawner.maxHeightDiff / 2
      );

      if (
        y >= this._y + IceWallSpawner.maxHeightDiff ||
        y === this._y - IceWallSpawner.maxHeightDiff
      ) {
        server.kill(this);
        return;
      }

      this._y = y;
      const wall = new IceWall(
        this._x - IceWallSpawner.wallDistance / 2,
        this._y - 6,
        this.character,
        getLevel().terrain.characterMask
      );
      server.create(wall);

      this._x += IceWallSpawner.wallDistance * this.direction;
      this.wallCount--;

      if (this.wallCount <= 0) {
        server.kill(this);
      }
    }
  }

  die() {
    getLevel().remove(this);
    this.character.setSpellSource(this, false);
    getManager().setTurnState(TurnState.Ending);
  }

  serializeCreate() {
    return [this._x, this._y, this.character.id] as const;
  }

  static create(data: ReturnType<IceWallSpawner["serializeCreate"]>) {
    return new IceWallSpawner(
      data[0],
      data[1],
      getLevel().entityMap.get(data[2]) as Character
    );
  }

  static cast(x: number, y: number, character: Character) {
    const server = getServer();
    if (!server) {
      return;
    }

    const entity = new IceWallSpawner(x, y, character);

    server.create(entity);
    return entity;
  }
}
