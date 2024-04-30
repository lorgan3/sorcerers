import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { circle9x9 } from "../collision/precomputed/circles";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, HurtableEntity } from "../entity/types";
import { Server } from "../network/server";
import { StaticBody } from "../collision/staticBody";
import { TargetList } from "../damage/targetList";
import { CollisionMask } from "../collision/collisionMask";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Character } from "../entity/character";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { map } from "../../util/math";
import { GenericDamage } from "../damage/genericDamage";
import { Element } from "./types";

export class IceWall extends Container implements HurtableEntity {
  public readonly body: StaticBody;
  private sprite: AnimatedSprite;
  private spikeArea: CollisionMask;
  private particles: SimpleParticleEmitter;

  public hp = 10;
  private time = 0;
  private firstCheck = true;
  private physicalPower = 1;

  public id = -1;
  public readonly type = EntityType.IceWall;

  constructor(x: number, y: number) {
    super();
    this.physicalPower = Manager.instance.getElementValue(Element.Physical);

    this.body = new StaticBody(Level.instance.terrain.characterMask, {
      mask: circle9x9,
    });
    this.body.move(x, y);
    this.position.set(x * 6, y * 6);
    ControllableSound.fromEntity(this, Sound.Ice);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_iceWall"]);
    this.sprite.animationSpeed = 0.08;
    this.sprite.scale.set(2);
    this.sprite.position.set(27, 9);
    this.sprite.loop = false;
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 48,
        spawnFrequency: 0,
        lifeTimeVariance: 0.6,
        initialize: () => ({
          x: this.position.x + 27,
          y: this.position.y + 27,
          scale: map(0.5, 1, Math.random()),
          xVelocity: Math.random() - 0.5,
          yVelocity: -2 + Math.random() - 0.5,
        }),
      }
    );

    this.spikeArea = Level.instance.terrain.collisionMask.difference(
      this.body.mask,
      ...this.body.position
    );

    // const sprite2 = new Sprite(Texture.fromBuffer(circle9x9Canvas.data, 9, 9));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);
    this.add();
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  private add() {
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  damage(): void {
    Server.instance?.kill(this);
  }

  die() {
    Level.instance.terrain.characterMask.subtract(
      this.spikeArea,
      ...this.body.position
    );

    ControllableSound.fromEntity(this, Sound.Glass);
    this.particles.burst(10);
    Level.instance.remove(this);
    Level.instance.particleContainer.destroyEmitter(this.particles);
    Manager.instance.setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x + 27, this.position.y - 15];
  }

  tick(dt: number) {
    this.time += dt;

    if (this.body.moved) {
      this.body.moved = false;
      const [x, y] = this.body.precisePosition;
      this.position.set(x * 6, y * 6);

      if (Math.random() > 0.98) {
        Server.instance.kill(this);
        return;
      }
    }

    if (this.time > 15 && Server.instance) {
      this.time = 0;
      Level.instance.withNearbyEntities(...this.getCenter(), 64, (entity) => {
        if (entity instanceof Character) {
          Server.instance.kill(this);

          const targets = new TargetList().add(
            entity,
            (this.firstCheck ? 4 : 10) * this.physicalPower
          );
          Level.instance.damage(new GenericDamage(targets));
          return;
        }
      });

      this.firstCheck = false;
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<IceWall["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [...this.body.precisePosition] as const;
  }

  static create(data: ReturnType<IceWall["serializeCreate"]>) {
    return new IceWall(...data);
  }
}
