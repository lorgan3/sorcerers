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
import { EntityType, Layer, Priority, Syncable } from "../entity/types";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Server } from "../network/server";

const SHAKE_INTENSITY = 8;

export class Sword extends Container implements Syncable {
  public readonly body: SimpleBody;
  private sprite!: Sprite;
  private bounceDuration =
    60 + Manager.instance.getElementValue(Element.Physical) * 10;
  private lastY?: number;
  private lifetime = 200;
  private collided = false;

  private shakeXOffset = 0;
  private shakeYOffset = 0;
  private fallingSound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.Excalibur;
  public readonly priority = Priority.High;
  public readonly layer = Layer.Overlay;

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
    this.sprite.position.set(-55, -700);
    this.sprite.scale.set(6);

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
    this.collided = true;
  };

  tick(dt: number) {
    this.lifetime -= dt;
    this.body.tick(dt);

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6 + this.shakeXOffset, y * 6 + this.shakeYOffset);
    this.fallingSound?.update([this.position.x, this.position.y]);

    if (!this.lastY || Math.abs(this.lastY - y) >= 2) {
      const damage = new FallDamage(
        x,
        y - 4,
        Shape.SwordTip,
        2 + 2 * Manager.instance.getElementValue(Element.Arcane)
      );
      Server.instance?.damage(damage, Server.instance.getActivePlayer());

      if (this.collided) {
        this.collided = false;
        this.bounceDuration -= dt;

        this.shakeXOffset =
          Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;
        this.shakeYOffset =
          Math.random() * SHAKE_INTENSITY - SHAKE_INTENSITY / 2;

        ControllableSound.fromEntity(
          [this.position.x, this.position.y],
          Sound.Step
        );

        if (damage.getTargets().hasEntities()) {
          const velocity: [0, 0] = [0, 0];
          for (let entity of damage.getTargets().getEntities()) {
            const [x, y] = entity.body instanceof StaticBody ? [2, -2] : [1, 0];

            if (this.position.x + 32 > entity.getCenter()[0]) {
              velocity[0] += x;
            } else {
              velocity[0] -= x;
            }
            velocity[1] += y;
          }

          this.body.setVelocity(...velocity);
        }

        if (this.bounceDuration <= 0) {
          this.die();
        }
      }

      if (this.lifetime <= 0 && this.y > 2000) {
        this.die();
      }
    }
  }

  die() {
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);

    if (this.lifetime > 5) {
      ControllableSound.fromEntity(this, Sound.Glass);

      for (let i = 3; i <= 9; i += 3) {
        for (let j = -70; j < 0; j += 3) {
          Level.instance.bloodEmitter.spawn(
            Math.ceil(this.position.x) + i * 6,
            Math.ceil(this.position.y) + j * 6,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            "#0690ce"
          );
        }
      }
    }
  }

  getCenter(): [number, number] {
    return [this.position.x + 9, this.position.y - 116];
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
    Server.instance.focus(entity);
    return entity;
  }
}
