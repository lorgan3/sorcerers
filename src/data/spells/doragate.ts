import { Container } from "pixi.js";
import { Level } from "../map/level";
import { Character } from "../entity/character";
import { EntityType, Spawnable } from "../entity/types";
import { circle3x3 } from "../collision/precomputed/circles";
import { Server } from "../network/server";
import { Pebble } from "./pebble";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { Element } from "./types";

export class Doragate extends Container implements Spawnable {
  private static pebbleAmount = 4;
  private static launchInterval = 5;
  private static launchDelay = 100;
  private static launchPower = 6;
  private static lifetime = 200;

  public id = -1;
  public readonly type = EntityType.Doragate;

  private pebbles: Pebble[];
  private time = 0;
  private launchCounter = 0;
  private sound: ControllableSound | undefined;

  constructor(
    private direction: number,
    private positions: Array<[number, number]>,
    private groundLevel: number,
    private character: Character
  ) {
    super();
    character.setSpellSource(this);
    this.sound = ControllableSound.fromEntity(character, Sound.Rumble);

    this.pebbles = this.positions.map(
      ([x, y]) => new Pebble(x, y, groundLevel)
    );
    Level.instance.add(...this.pebbles);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    this.time += dt;

    this.sound?.fade(dt, Doragate.launchDelay);

    if (
      this.launchCounter < this.pebbles.length &&
      this.time >=
        Doragate.launchDelay + Doragate.launchInterval * this.launchCounter
    ) {
      this.pebbles[this.launchCounter].launch(
        Doragate.launchPower,
        this.direction
      );

      this.launchCounter++;
    }

    if (Server.instance && this.time > Doragate.lifetime) {
      Level.instance.remove(...this.pebbles);
      Server.instance.kill(this);
    }
  }

  die() {
    this.character.setSpellSource(this, false);
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);
  }

  serializeCreate() {
    return [
      this.direction,
      this.positions,
      this.groundLevel,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<Doragate["serializeCreate"]>) {
    return new Doragate(
      data[0],
      data[1],
      data[2],
      Level.instance.entityMap.get(data[3]) as Character
    );
  }

  static cast(_x: number, _y: number, character: Character, direction: number) {
    if (!Server.instance) {
      return;
    }

    const positions: Array<[number, number]> = [];
    const [cx, cy] = character.getCenter();
    for (
      let i = 0;
      i <
      Doragate.pebbleAmount +
        Manager.instance.getElementValue(Element.Physical);
      i++
    ) {
      const x = Math.floor(cx / 6 - 12 + Math.random() * 25);
      const y = Math.floor(cy / 6 + 6 - Math.random() * 20);

      if (!Level.instance.terrain.collisionMask.collidesWith(circle3x3, x, y)) {
        positions.push([x, y]);
      }
    }

    const [_, ry] = character.body.position;
    const entity = new Doragate(direction, positions, ry + 20, character);

    Server.instance.create(entity);
    return entity;
  }
}
