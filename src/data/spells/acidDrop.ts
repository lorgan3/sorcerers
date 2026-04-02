import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { Character } from "../entity/character";

import { TurnState } from "../network/types";
import { EntityType, Priority, Spawnable } from "../entity/types";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { AcidSplash } from "../../graphics/acidSplash";
import { FallDamage, Shape } from "../damage/fallDamage";
import { CollisionMask } from "../collision/collisionMask";

export class AcidDrop extends Container implements Spawnable {
  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private lifetime = 200;

  public id = -1;
  public readonly type = EntityType.AcidDrop;
  public readonly priority = Priority.Dynamic;

  constructor(
    x: number,
    y: number,
    speed: number,
    direction: number,
    collisionMask: CollisionMask
  ) {
    super();

    this.body = new SimpleBody(collisionMask, {
      mask: circle3x3,
      onCollide: getServer() ? this.onCollide : undefined,
      friction: 0.99,
      gravity: 0.04,
      bounciness: 1,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Fire);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_acid"]);
    this.sprite.scale.set(2);
    this.sprite.animationSpeed = 0.3;
    this.sprite.currentFrame = Math.floor(
      this.sprite.totalFrames * Math.random()
    );
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(10);
    this.sprite.alpha = 0.6;

    // const sprite2 = new Sprite(Texture.from(circle3x3Canvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);
  }

  private onCollide = (_x: number, _y: number, vx: number, vy: number) => {
    const [x, y] = this.body.precisePosition;
    this._die(x, y);
  };

  private _die(x: number, y: number) {
    const server = getServer();
    server?.damage(
      new FallDamage(
        x,
        y,
        Shape.Acid,
        10 + getManager().getElementValue(Element.Life)
      ),
      server.getActivePlayer()
    );
    server?.kill(this);
  }

  die() {
    getLevel().remove(this);
    getManager().setTurnState(TurnState.Ending);
    new AcidSplash(...this.getCenter());
    ControllableSound.fromEntity(this, Sound.Slime);
  }

  getCenter(): [number, number] {
    return [this.position.x + 10, this.position.y + 10];
  }

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    this.lifetime -= dt;
    if (this.lifetime <= 0 && getServer()) {
      this._die(x, y);
    }
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
    ] as const;
  }

  static create(data: ReturnType<AcidDrop["serializeCreate"]>) {
    return new AcidDrop(...data, getLevel().terrain.characterMask);
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    const server = getServer();
    if (!server) {
      return;
    }

    const entity = new AcidDrop(x, y, power / 1.5, direction, getLevel().terrain.characterMask);

    server.create(entity);
    return entity;
  }
}
