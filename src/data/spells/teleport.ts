import { AnimatedSprite, Container } from "pixi.js";

import { Level } from "../map/level";
import { Character } from "../entity/character";
import { Server } from "../network/server";
import { EntityType, Spawnable } from "../entity/types";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class Teleport extends Container implements Spawnable {
  private static teleportTime = 10;

  public id = -1;
  public readonly type = EntityType.Teleport;

  private fromSprite: AnimatedSprite;
  private toSprite: AnimatedSprite;
  private time = 0;

  constructor(
    private rx: number,
    private ry: number,
    private character: Character
  ) {
    super();

    this.fromSprite = this.createSprite(...this.character.body.precisePosition);
    this.fromSprite.onComplete = () => Level.instance.remove(this);

    this.toSprite = this.createSprite(rx, ry);

    this.addChild(this.fromSprite, this.toSprite);
    Level.instance.add(this);

    ControllableSound.fromEntity(this.character, Sound.Smoke);
  }

  private createSprite(x: number, y: number) {
    const sprite = new AnimatedSprite(
      AssetsContainer.instance.assets!["atlas"].animations["spells_appear"]
    );
    sprite.anchor.set(0.4, 0.5);
    sprite.position.set(x * 6, y * 6);
    sprite.loop = false;
    sprite.scale.set(3);
    sprite.animationSpeed = 0.25;
    sprite.play();

    return sprite;
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    if (!Server.instance || this.time >= Teleport.teleportTime) {
      return;
    }

    this.time += dt;

    if (this.time >= Teleport.teleportTime) {
      this.character.move(this.rx, this.ry);
    }
  }

  serializeCreate() {
    return [this.rx, this.ry, this.character.id] as const;
  }

  static create(data: ReturnType<Teleport["serializeCreate"]>) {
    return new Teleport(
      data[0],
      data[1],
      Level.instance.entityMap.get(data[2]) as Character
    );
  }

  static cast(x: number, y: number, _: null, character: Character) {
    if (!Server.instance) {
      return;
    }

    const entity = new Teleport(x, y, character);

    Server.instance.create(entity);
    return entity;
  }
}
