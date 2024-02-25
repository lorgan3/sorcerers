import { Container } from "pixi.js";
import { Level } from "../map/level";

import { Character } from "../entity/character";

import { EntityType, Spawnable } from "../entity/types";
import { CatastraviaMissile } from "./catastraviaMissile";
import { circle9x9 } from "../collision/precomputed/circles";
import { Server } from "../network/server";
import { TurnState } from "../network/types";
import { Manager } from "../network/manager";
import { Element } from "./types";

export class Catastravia extends Container implements Spawnable {
  private static missileCount = 15;
  private static spawnInterval = 6;
  private static spawnAttempts = 10;

  public id = -1;
  public readonly type = EntityType.Catastravia;

  private missiles: CatastraviaMissile[] = [];
  private time = 0;
  private lastSpawn = 0;
  private alternate = 1;
  private missileCount: number;
  private range: number;

  private targetX: number;
  private targetY: number;

  constructor(
    private direction: number,
    private distance: number,
    private character: Character
  ) {
    super();
    character.setSpellSource(this);

    this.missileCount =
      Catastravia.missileCount +
      Math.round(Manager.instance.getElementValue(Element.Life) * 2.67 - 2.5);
    this.range = 3 + Manager.instance.getElementValue(Element.Arcane) * 2;

    const [cx, cy] = character.getCenter();
    this.targetX = Math.floor(cx / 6 + Math.cos(direction) * distance);
    this.targetY = Math.floor(cy / 6 + Math.sin(direction) * distance);
  }

  tick(dt: number) {
    if (!Server.instance) {
      return;
    }

    this.time += dt;

    if (this.missiles.length === this.missileCount) {
      if (this.missiles.every((missle) => missle.dead)) {
        Server.instance.kill(this);
        Server.instance.setTurnState(
          this.missileCount === 0 ? TurnState.Ongoing : TurnState.Ending
        );
      }

      return;
    }

    if (this.time >= this.lastSpawn + Catastravia.spawnInterval) {
      this.lastSpawn = this.time;

      const [cx, cy] = this.character.getCenter();
      for (let j = 0; j < 2; j++) {
        this.alternate *= -1;

        for (let i = 0; i < Catastravia.spawnAttempts; i++) {
          const _dir =
            this.direction +
            (Math.random() * Math.PI) / 4 -
            Math.PI / 8 +
            (Math.PI / this.range) * this.alternate;

          const x = Math.floor(
            (cx + Math.cos(_dir) * (96 + Math.random() * 64)) / 6
          );
          const y = Math.floor(
            (cy + Math.sin(_dir) * (96 + Math.random() * 64)) / 6
          );

          if (!Level.instance.collidesWith(circle9x9, x - 3, y - 3)) {
            const missile = new CatastraviaMissile(
              x,
              y,
              _dir,
              this.targetX,
              this.targetY
            );

            Server.instance.create(missile);
            this.missiles.push(missile);
            return;
          }
        }
      }

      // This happens if a missile could not be spawned after 20 attempts
      this.missileCount = this.missiles.length;
    }
  }

  die() {
    this.character.setSpellSource(this, false);
    Level.instance.remove(this);
  }

  serializeCreate() {
    return [this.direction, this.distance, this.character.id] as const;
  }

  static create(data: ReturnType<Catastravia["serializeCreate"]>) {
    return new Catastravia(
      data[0],
      data[1],
      Level.instance.entityMap.get(data[2]) as Character
    );
  }

  static cast(x: number, y: number, character: Character, power: number) {
    if (!Server.instance) {
      return;
    }

    const [x2, y2] = character.getCenter();
    const direction = Math.atan2(y - y2 / 6, x - x2 / 6);

    const entity = new Catastravia(direction, 50 + 20 * power, character);

    Server.instance.create(entity);
    return entity;
  }
}
