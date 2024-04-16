import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle9x9 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, Priority, Spawnable } from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { AcidSplash } from "../../graphics/acidSplash";
import { FallDamage, Shape } from "../damage/fallDamage";

export class Acid extends Container implements Spawnable {
  private static splitAmount = 5;
  private static splitRange = Math.PI / 3;

  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private lifetime = 200;

  public id = -1;
  public readonly type = EntityType.Acid;
  public readonly priority = Priority.Dynamic;

  constructor(
    x: number,
    y: number,
    speed: number,
    direction: number,
    private isParent = false
  ) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle9x9,
      onCollide: Server.instance ? this.onCollide : undefined,
      friction: 0.99,
      gravity: 0.04,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Fire);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_acid"]);
    this.sprite.scale.set(3);
    this.sprite.animationSpeed = 0.3;
    this.sprite.currentFrame = Math.floor(
      this.sprite.totalFrames * Math.random()
    );
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(30);
    this.sprite.alpha = 0.6;

    // const sprite2 = new Sprite(Texture.fromBuffer(circle9x9Canvas.data, 9, 9));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);

    if (this.isParent) {
      ControllableSound.fromEntity(this, Sound.Water);
    }
  }

  private onCollide = (x: number, y: number, vx: number, vy: number) => {
    this._die(x, y);

    if (this.isParent) {
      for (let i = 0; i < Acid.splitAmount; i++) {
        const direction = -Math.atan2(vy, vx);
        const entity = new Acid(
          x,
          y,
          1 + Math.random(),
          direction -
            Acid.splitRange / 2 +
            (i / (Acid.splitAmount - 1)) * Acid.splitRange
        );
        Server.instance.create(entity);
      }
    }
  };

  private _die(x: number, y: number) {
    Level.instance.damage(
      new FallDamage(
        x - 4,
        y - 4,
        Shape.Acid,
        5 + Manager.instance.getElementValue(Element.Life) * 2
      )
    );
    Server.instance.kill(this);
  }

  die() {
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);
    new AcidSplash(...this.getCenter());
    ControllableSound.fromEntity(this, Sound.Slime);
  }

  getCenter(): [number, number] {
    return [this.position.x + 30, this.position.y + 30];
  }

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    this.lifetime -= dt;
    if (this.lifetime <= 0 && Server.instance) {
      this._die(x, y);
    }
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
      this.isParent,
    ] as const;
  }

  static create(data: ReturnType<Acid["serializeCreate"]>) {
    return new Acid(...data);
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    if (!Server.instance) {
      return;
    }

    const entity = new Acid(x, y, power / 1.5, direction, true);

    Server.instance.create(entity);
    return entity;
  }
}
