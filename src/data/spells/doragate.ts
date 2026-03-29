import { Container } from "pixi.js";
import { Character } from "../entity/character";
import { EntityType, Spawnable } from "../entity/types";
import { circle3x3 } from "../collision/precomputed/circles";
import { Pebble } from "./pebble";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { TurnState } from "../network/types";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";

export class Doragate extends Container implements Spawnable {
  private static pebbleAmount = 4;
  private static launchInterval = 5;
  private static launchDelay = 100;
  private static launchPower = 6;
  private static lifetime = 220;

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
      ([x, y]) =>
        new Pebble(x, y, groundLevel, character, getLevel().terrain.characterMask)
    );
    getLevel().add(...this.pebbles);
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

    if (getServer() && this.time > Doragate.lifetime) {
      getLevel().remove(...this.pebbles);
      getServer()!.kill(this);
    }
  }

  die() {
    this.character.setSpellSource(this, false);
    getLevel().remove(this);
    getManager().setTurnState(TurnState.Ending);
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
      getLevel().entityMap.get(data[3]) as Character
    );
  }

  static cast(_x: number, _y: number, character: Character, direction: number) {
    if (!getServer()) {
      return;
    }

    const positions: Array<[number, number]> = [];
    const [cx, cy] = character.getCenter();
    for (
      let i = 0;
      i <
      Doragate.pebbleAmount +
        getManager().getElementValue(Element.Physical);
      i++
    ) {
      const x = Math.floor(cx / 6 - 12 + Math.random() * 25);
      const y = Math.floor(cy / 6 + 6 - Math.random() * 20);

      if (!getLevel().terrain.collisionMask.collidesWith(circle3x3, x, y)) {
        positions.push([x, y]);
      }
    }

    const [_, ry] = character.body.position;
    const entity = new Doragate(direction, positions, ry + 20, character);

    getServer()!.create(entity);
    return entity;
  }
}
