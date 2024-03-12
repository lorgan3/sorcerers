import { Container } from "pixi.js";
import { Level } from "../map/level";

import { Character } from "../entity/character";

import { EntityType, Spawnable } from "../entity/types";
import { Server } from "../network/server";
import { TurnState } from "../network/types";
import { Manager } from "../network/manager";
import { Element } from "./types";
import { SmallSword } from "./smallSword";
import { probeX } from "../map/utils";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class GateOfBabylon extends Container implements Spawnable {
  private static swordCount = 10;
  private static spawnInterval = 25;
  private static spawnDelay = 30;
  private static spawnRange = 20;

  public id = -1;
  public readonly type = EntityType.GateOfBabylon;

  private swords: SmallSword[] = [];
  private time = 0;
  private lastSpawn = GateOfBabylon.spawnDelay;
  private swordCount: number;
  private sound?: ControllableSound;

  constructor(private _x: number, private character: Character) {
    super();
    character.setSpellSource(this);

    this.swordCount =
      GateOfBabylon.swordCount +
      Math.round(
        Manager.instance.getElementValue(Element.Physical) * 2.67 - 2.5
      );

    const y = probeX(Level.instance.terrain.collisionMask, _x) - 50;
    this.position.set(_x * 6, y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.DarkMagic, {
      loop: true,
    });
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    if (!Server.instance) {
      return;
    }

    this.time += dt;

    if (this.swords.length === this.swordCount) {
      this.sound?.fade(dt, 25);
      if (this.swords.every((sword) => sword.dead)) {
        Server.instance.kill(this);
        Server.instance.setTurnState(TurnState.Ending);
      }

      return;
    }

    if (this.time >= this.lastSpawn + GateOfBabylon.spawnInterval) {
      this.lastSpawn = this.time;

      const x = Math.round(
        this._x +
          Math.random() * GateOfBabylon.spawnRange -
          GateOfBabylon.spawnRange / 2
      );

      const y = probeX(Level.instance.terrain.collisionMask, x);

      const sword = new SmallSword(x, y - 50 - Math.random() * 50);
      Server.instance.create(sword);
      this.swords.push(sword);
    }
  }

  die() {
    Level.instance.remove(this);
    this.character.setSpellSource(this, false);
    Manager.instance.setTurnState(TurnState.Ending);
    this.sound?.destroy();
  }

  serializeCreate() {
    return [this._x, this.character.id] as const;
  }

  static create(data: ReturnType<GateOfBabylon["serializeCreate"]>) {
    return new GateOfBabylon(
      data[0],
      Level.instance.entityMap.get(data[1]) as Character
    );
  }

  static cast(x: number, y: number, character: Character) {
    if (!Server.instance) {
      return;
    }

    const entity = new GateOfBabylon(x, character);

    Server.instance.create(entity);
    return entity;
  }
}
