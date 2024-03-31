import { Container, Sprite } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";

import { swordTip } from "../collision/precomputed/triangles";
import { FallDamage, Shape } from "../damage/fallDamage";
import { Character } from "../entity/character";
import { StaticBody } from "../collision/staticBody";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, Priority, Syncable } from "../entity/types";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Server } from "../network/server";

const SHAKE_INTENSITY = 8;

export class Sword extends Container implements Syncable {
  public readonly body: SimpleBody;
  private sprite!: Sprite;
  private bounces = 120 * Manager.instance.getElementValue(Element.Physical);
  private lastY?: number;
  private lifetime = 150;

  private shakeXOffset = 0;
  private shakeYOffset = 0;
  private fallingSound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.Excalibur;
  public readonly priority = Priority.Low;

  constructor(x: number, y: number) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: swordTip,
      onCollide: this.onCollide,
      bounciness: 0.8,
      friction: 0.95,
    });
    this.body.move(Math.round(x), y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new Sprite(atlas.textures["spells_sword"]);
    this.sprite.position.set(-55, 105);
    this.sprite.scale.y = -1;

    // const sprite2 = new Sprite(Texture.from(swordTipCanvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);

    this.fallingSound = ControllableSound.fromEntity(
      [x * 6, y * 6],
      Sound.Arrow
    );
  }

  private onCollide = (x: number, y: number) => {
    if (this.lastY && Math.abs(this.lastY - y) < 1) {
      return;
    }

    this.bounces--;
    this.lastY = y;
    this.shakeXOffset = Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;
    this.shakeYOffset = Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;

    const damage = new FallDamage(
      x,
      y - 4,
      Shape.SwordTip,
      4 * Manager.instance.getElementValue(Element.Arcane)
    );
    Level.instance.damage(damage);
    ControllableSound.fromEntity(
      [this.position.x, this.position.y],
      Sound.Step
    );

    for (let entity of damage.getTargets().getEntities()) {
      const [x, y] =
        entity.body instanceof StaticBody ? [0.75, -1.5] : [0.3, 0];

      if (this.position.x + 32 > entity.getCenter()[0]) {
        this.body.addVelocity(x, y);
      } else {
        this.body.addVelocity(x * -1, y);
      }
    }

    if (this.bounces <= 0) {
      this.die();
    }
  };

  tick(dt: number) {
    this.body.tick(dt);

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6 + this.shakeXOffset, y * 6 + this.shakeYOffset);
    this.fallingSound?.update([this.position.x, this.position.y]);

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.die();
    }
  }

  die() {
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<this["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [...this.body.precisePosition] as const;
  }

  static create(data: ReturnType<Sword["serializeCreate"]>) {
    return new Sword(...data);
  }

  static cast(x: number, y: number, character: Character) {
    if (!Server.instance) {
      return;
    }

    const entity = new Sword(x, y);

    Server.instance.create(entity);
    return entity;
  }
}
