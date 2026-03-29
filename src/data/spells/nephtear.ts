import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { Character } from "../entity/character";

import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../graphics/particles/types";
import { TurnState } from "../network/types";
import { EntityType, Spawnable } from "../entity/types";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { CollisionMask } from "../collision/collisionMask";
import { map } from "../../util/math";
import { IceImpact } from "../../graphics/iceImpact";
import { ImpactDamage } from "../damage/impactDamage";

export class Nephtear extends Container implements Spawnable {
  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private particles: ParticleEmitter;
  private lifetime = 200;

  public id = -1;
  public readonly type = EntityType.Nephtear;

  constructor(x: number, y: number, speed: number, direction: number, collisionMask: CollisionMask) {
    super();

    this.body = new SimpleBody(collisionMask, {
      mask: circle3x3,
      onCollide: getServer() ? this.onCollide : undefined,
      friction: 1,
      gravity: 0.01,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Glass);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_iceSpike"]);
    this.sprite.animationSpeed = 0.1;
    this.sprite.rotation = direction;
    this.sprite.scale.set(2);
    this.sprite.position.set(8, 8);
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 16,
        lifeTime: 20,
        lifeTimeVariance: 1,
        initialize: () => ({
          x: this.position.x + 8,
          y: this.position.y + 8,
          scale: map(0.5, 1, Math.random()),
          xVelocity: Math.random() - 0.5,
          yVelocity: Math.random() - 0.5,
        }),
      }
    );

    // const sprite2 = new Sprite(Texture.from(circle3x3Canvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);
    getLevel().particleContainer.addEmitter(this.particles);
  }

  private onCollide = (x: number, y: number) => {
    this._die(x, y);
  };

  private _die(x: number, y: number) {
    getServer()!.damage(
      new ImpactDamage(
        x,
        y,
        this.sprite.rotation,
        30 * (0.7 + getManager().getElementValue(Element.Elemental) * 0.3)
      ),
      getServer()!.getActivePlayer()
    );
    getServer()!.kill(this);
  }

  die() {
    getLevel().remove(this);
    getLevel().particleContainer.destroyEmitter(this.particles);
    new IceImpact(this.position.x, this.position.y, this.sprite.rotation);
    getManager().setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x + 8, this.position.y + 8];
  }

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);
    this.sprite.rotation = this.body.direction;

    this.lifetime -= dt;
    if (this.lifetime <= 0 && getServer()) {
      this._die(x, y);
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<Nephtear["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
    ] as const;
  }

  static create(data: ReturnType<Nephtear["serializeCreate"]>) {
    return new Nephtear(...data, getLevel().terrain.characterMask);
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    if (!getServer()) {
      return;
    }

    const entity = new Nephtear(x, y, 2 + power / 3, direction, getLevel().terrain.characterMask);

    getServer()!.create(entity);
    return entity;
  }
}
