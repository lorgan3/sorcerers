import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle3x3 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import { EntityType, Priority, Syncable } from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";
import { Key } from "../controller/controller";
import { angleDiff, getAngle } from "../../util/math";
import { ParticleEmitter } from "../../graphics/particles/types";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Implosion } from "../../graphics/implosion";

export class MagicMissile extends Container implements Syncable {
  private static lifetime = 400;

  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private lifetime: number;
  private particles: ParticleEmitter;
  private sound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.MagicMissile;
  public readonly priority = Priority.High;

  constructor(
    x: number,
    y: number,
    private speed: number,
    private direction: number,
    private character: Character
  ) {
    super();
    character.setSpellSource(this);
    this.lifetime =
      MagicMissile.lifetime * Manager.instance.getElementValue(Element.Life);

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle3x3,
      onCollide: Server.instance ? this.onCollide : undefined,
      friction: 0.97,
      gravity: 0.1,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_magicMissile"]);
    this.sprite.animationSpeed = 0.1;
    this.sprite.play();
    this.sprite.anchor.set(0.625, 0.5);
    this.sprite.position.set(8, 8);
    this.sprite.scale.set(2);

    // const sprite2 = new Sprite(Texture.fromBuffer(circle3x3Canvas.data, 3, 3));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        lifeTime: 30,
        lifeTimeVariance: 1,
        spawnRange: 64,
        spawnFrequency: 0.3,
        tint: 0xff66ef,
        initialize: () => ({
          x: this.position.x,
          y: this.position.y,
        }),
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
    Level.instance.cameraTarget.setTarget(this);
  }

  getCenter(): [number, number] {
    return [this.position.x + 24, this.position.y + 24];
  }

  private onCollide = (x: number, y: number) => {
    this._die(x, y);
  };

  private _die(x: number, y: number) {
    Level.instance.damage(
      new ExplosiveDamage(
        x,
        y,
        16,
        3,
        5 + Manager.instance.getElementValue(Element.Arcane)
      )
    );

    Server.instance.kill(this);
  }

  die() {
    Level.instance.remove(this);

    const [x, y] = this.body.precisePosition;
    new Implosion(x * 6, y * 6);
    Manager.instance.setTurnState(TurnState.Ending);
    this.character.setSpellSource(this, false);
    Level.instance.particleContainer.destroyEmitter(this.particles);
    this.sound?.destroy();
  }

  tick(dt: number) {
    if (this.sound) {
      this.sound.update([this.position.x, this.position.y]);
    } else {
      this.sound = ControllableSound.fromEntity(this, Sound.Sparkle, {
        loop: true,
      });
    }

    this.body.tick(dt);
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);
    this.sprite.rotation = this.body.direction;

    if (this.character.player.controller.isKeyDown(Key.M1)) {
      const angle = angleDiff(
        this.direction,
        getAngle(x * 6, y * 6, ...this.character.player.controller.getMouse())
      );

      const max = 0.1;
      this.direction += Math.max(-max, Math.min(max, angle)) * dt;
      this.body.setAngularVelocity(this.speed, this.direction);
      this.body.gravity = 0;
    } else {
      this.body.gravity = 0.1;
    }

    this.lifetime -= dt;
    if (this.lifetime <= 0 && Server.instance) {
      this._die(x, y);
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<MagicMissile["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.body.direction,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<MagicMissile["serializeCreate"]>) {
    return new MagicMissile(
      data[0],
      data[1],
      data[2],
      data[3],
      Level.instance.entityMap.get(data[4]) as Character
    );
  }

  static cast(x: number, y: number, character: Character, direction: number) {
    if (!Server.instance) {
      return;
    }

    const entity = new MagicMissile(x, y, 1.5, direction, character);

    Server.instance.create(entity);
    return entity;
  }
}
