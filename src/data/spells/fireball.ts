import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Projectile } from ".";
import { Character } from "../entity/character";

import { SimpleParticleEmitter } from "../../grapics/particles/simpleParticleEmitter";
import { Explosion } from "../../grapics/explosion";

export class Fireball extends Container implements Projectile {
  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private particles: SimpleParticleEmitter;
  private bounces = 5;

  constructor(x: number, y: number) {
    super();

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: this.onCollide,
      bounciness: -0.9,
      friction: 0.96,
      gravity: 0.25,
    });
    this.body.move(x, y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_flame"]);
    this.sprite.animationSpeed = 0.3;
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_puff"],
      { ...SimpleParticleEmitter.defaultConfig, yVelocity: -3 }
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
      Level.instance.remove(this);
      Level.instance.particleContainer.destroyEmitter(this.particles);
      Level.instance.damage(new ExplosiveDamage(x, y, 16));
      new Explosion(x * 6, y * 6);
    } else {
      Level.instance.damage(new ExplosiveDamage(x, y, 4));
    }
  };

  tick(dt: number) {
    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);
    this.particles.setSpawnPosition(this.position.x, this.position.y);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any) {
    this.body.deserialize(data);
  }

  static cast(x: number, y: number, character: Character) {
    const entity = new Fireball(x, y);

    Level.instance.add(entity);
    return entity;
  }
}
