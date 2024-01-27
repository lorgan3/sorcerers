import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { Explosion } from "../../graphics/explosion";
import { ParticleEmitter } from "../../graphics/particles/types";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, Priority, Syncable } from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";

export class Fireball extends Container implements Syncable {
  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private particles: ParticleEmitter;
  private bounces = 5;
  private lifetime = 100;

  public id = -1;
  public readonly type = EntityType.Fireball;
  public readonly priority = Priority.Dynamic;

  constructor(x: number, y: number, speed: number, direction: number) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: Server.instance ? this.onCollide : undefined,
      bounciness: -0.9,
      friction: 0.96,
      gravity: 0.25,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_flame"]);
    this.sprite.animationSpeed = 0.3;
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_puff"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        initialize: () => ({
          x: this.position.x,
          y: this.position.y,
          yVelocity: -3,
        }),
      }
    );

    // const sprite2 = new Sprite(Texture.fromBuffer(circle3x3Canvas.data, 3, 3));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  private onCollide = (x: number, y: number) => {
    this.bounces--;

    const playerCollision = !Level.instance.terrain.collisionMask.collidesWith(
      this.body.mask,
      x,
      y
    );

    if (this.bounces === 0 || playerCollision) {
      this._die(x, y);
    } else {
      Level.instance.damage(
        new ExplosiveDamage(
          x,
          y,
          4,
          1,
          1 + Manager.instance.getElementValue(Element.Elemental)
        )
      );
      Server.instance.dynamicUpdate(this);
    }
  };

  private _die(x: number, y: number) {
    Level.instance.damage(
      new ExplosiveDamage(
        x,
        y,
        16,
        3,
        2 + Manager.instance.getElementValue(Element.Elemental)
      )
    );
    Server.instance.kill(this);
  }

  die() {
    Level.instance.remove(this);
    Level.instance.particleContainer.destroyEmitter(this.particles);
    new Explosion(this.position.x, this.position.y);
    Manager.instance.setTurnState(TurnState.Ending);
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

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<Fireball["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
    ] as const;
  }

  static create(data: ReturnType<Fireball["serializeCreate"]>) {
    return new Fireball(...data);
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

    const entity = new Fireball(x, y, power * 1.5, direction);

    Server.instance.create(entity);
    return entity;
  }
}
