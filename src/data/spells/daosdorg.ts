import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { Character } from "../entity/character";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../graphics/particles/types";
import { TurnState } from "../network/types";
import { EntityType, Spawnable } from "../entity/types";
import { getLevel, getManager, getServer } from "../context";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { rectangle6x16 } from "../collision/precomputed/rectangles";
import { FallDamage, Shape } from "../damage/fallDamage";
import { map } from "../../util/math";
import { StaticBody } from "../collision/staticBody";
import { Element } from "./types";
import { CollisionMask } from "../collision/collisionMask";

export class Daosdorg extends Container implements Spawnable {
  private static baseLifeTime = 40;

  private static damageInterval = 6;

  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private particles: ParticleEmitter;
  private lastDamageTime = -Daosdorg.damageInterval;
  private time = 0;
  private lifeTime = 0;

  public id = -1;
  public readonly type = EntityType.Daosdorg;

  constructor(x: number, y: number, direction: number, collisionMask: CollisionMask) {
    super();

    this.lifeTime =
      Daosdorg.baseLifeTime *
      (0.5 + 0.5 * getManager().getElementValue(Element.Arcane));

    this.body = new SimpleBody(collisionMask, {
      mask: rectangle6x16,
      onCollide: getServer() ? this.onCollide : undefined,
      bounciness: 1,
      friction: 0.94,
      gravity: 0,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(3, direction);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Fire);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_tornado"]);
    this.sprite.animationSpeed = 0.2;
    this.sprite.scale.set(2);
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(18, 48);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        tint: 0xff66ef,
        spawnRange: 64,
        initialize: () => {
          const [x, y] = this.getCenter();

          return {
            x,
            y,
            xVelocity: Math.random() * 4 - 2,
            yVelocity: Math.random() * 4 - 2,
            scale: map(1, 2, Math.random()),
          };
        },
      }
    );

    // const sprite2 = new Sprite(Texture.from(rectangle6x16Canvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);
    getLevel().particleContainer.addEmitter(this.particles);
  }

  private onCollide = (x: number, y: number) => {
    if (this.lastDamageTime + Daosdorg.damageInterval > this.time) {
      return;
    }

    this.lastDamageTime = this.time;
    const damage = new FallDamage(
      x - 9,
      y - 4,
      Shape.Tornado,
      1.8 + getManager().getElementValue(Element.Physical)
    );
    const server = getServer();
    server?.damage(damage, server.getActivePlayer());

    if (
      damage
        .getTargets()
        .getEntities()
        .some((entity) => entity.body instanceof StaticBody)
    ) {
      this.body.setAngularVelocity(0, this.body.direction);
    }
  };

  die() {
    getLevel().remove(this);
    getLevel().particleContainer.destroyEmitter(this.particles);
    getManager().setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x + 18, this.position.y + 48];
  }

  tick(dt: number) {
    this.time += dt;

    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    if (
      this.body.velocity === 0 &&
      this.time >= this.lastDamageTime + Daosdorg.damageInterval * 3
    ) {
      this.lastDamageTime = this.time;
      const damage = new FallDamage(
        x - 9,
        y - 4,
        Shape.Tornado,
        3 + getManager().getElementValue(Element.Physical)
      );

      const server = getServer();
      server?.damage(damage, server.getActivePlayer());
    }

    if (this.time >= this.lifeTime) {
      this.die();
    }
  }

  serializeCreate() {
    return [...this.body.precisePosition, this.body.direction] as const;
  }

  static create(data: ReturnType<Daosdorg["serializeCreate"]>) {
    return new Daosdorg(...data, getLevel().terrain.characterMask);
  }

  static cast(x: number, y: number, character: Character, direction: number) {
    const server = getServer();
    if (!server) {
      return;
    }

    const entity = new Daosdorg(x, y, direction, getLevel().terrain.characterMask);

    server.create(entity);
    return entity;
  }
}
