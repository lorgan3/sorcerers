import { Container } from "pixi.js";
import { Character } from "../entity/character";

import { EntityType, Spawnable } from "../entity/types";
import { TurnState } from "../network/types";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";
import { CollisionMask } from "../collision/collisionMask";
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

  constructor(private _x: number, private character: Character, collisionMask: CollisionMask) {
    super();
    character.setSpellSource(this);

    this.swordCount =
      GateOfBabylon.swordCount +
      Math.round(
        getManager().getElementValue(Element.Physical) * 2.67 - 2.5
      );

    const y = probeX(collisionMask, _x) - 30;
    this.position.set(_x * 6, y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.DarkMagic, {
      loop: true,
    });
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    if (!getServer()) {
      return;
    }

    this.time += dt;

    if (this.swords.length === this.swordCount) {
      this.sound?.fade(dt, 25);
      if (this.swords.every((sword) => sword.dead)) {
        getServer()!.kill(this);
        getServer()!.setTurnState(TurnState.Ending);
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

      const y = probeX(getLevel().terrain.collisionMask, x);

      const sword = new SmallSword(x, y - 50 - Math.random() * 50, getLevel().terrain.characterMask);
      getServer()!.create(sword);
      this.swords.push(sword);
    }
  }

  die() {
    getLevel().remove(this);
    this.character.setSpellSource(this, false);
    getManager().setTurnState(TurnState.Ending);
    this.sound?.destroy();
  }

  serializeCreate() {
    return [this._x, this.character.id] as const;
  }

  static create(data: ReturnType<GateOfBabylon["serializeCreate"]>) {
    return new GateOfBabylon(
      data[0],
      getLevel().entityMap.get(data[1]) as Character,
      getLevel().terrain.characterMask
    );
  }

  static cast(x: number, y: number, character: Character) {
    if (!getServer()) {
      return;
    }

    const entity = new GateOfBabylon(x, character, getLevel().terrain.characterMask);

    getServer()!.create(entity);
    getServer()!.focus(entity);
    return entity;
  }
}
