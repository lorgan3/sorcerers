import {
  AnimatedSprite,
  Container,
  ImageBitmapResource,
  Texture,
} from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";
import { circle30x30 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../graphics/particles/types";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";
import {
  EntityType,
  HurtableEntity,
  Priority,
  Syncable,
} from "../entity/types";
import { Server } from "../network/server";
import { Element } from "./types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getAngle } from "../../util/math";
import { CollisionMask } from "../collision/collisionMask";

export class Meteor extends Container implements Syncable {
  private static bounces = 24;
  private static explodeInterval = 5;
  private static moveTime = 45;

  public readonly body: SimpleBody;
  private sprite: AnimatedSprite;
  private particles: ParticleEmitter;
  private bounces = Meteor.bounces;
  private textures: Texture<ImageBitmapResource>[];
  private sound?: ControllableSound;
  private bounceTime = 0;

  public id = -1;
  public readonly type = EntityType.Meteor;
  public readonly priority = Priority.Dynamic;

  constructor(
    x: number,
    y: number,
    private time: number,
    private direction: number,
    private character: Character
  ) {
    console.log("spawn", x, y, time, direction, character);

    super();
    character.setSpellSource(this);

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: circle30x30,
      onCollide: Server.instance ? this.onCollide : undefined,
      bounciness: 1,
      friction: 1,
      gravity: 0,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(3, direction);
    this.position.set(x * 6, y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.FireWork);

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.textures = atlas.animations["meteor"];

    this.sprite = new AnimatedSprite(this.textures);
    this.sprite.scale.set(6);
    this.sprite.animationSpeed = 0.15;
    this.sprite.position.set(90, 90);
    this.sprite.play();
    this.sprite.anchor.set(0.5);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_puff"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 24 * 6,
        initialize: () => ({
          x: this.position.x + 15 * 6,
          y: this.position.y + 15 * 6,
          scale: 3,
        }),
      }
    );
    Level.instance.backgroundParticles.addEmitter(this.particles);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(circle30x30Canvas.data, 30, 30)
    // );
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.3;

    this.addChild(this.sprite);
  }

  private onCollide = (x: number, y: number) => {
    if (Level.instance.collidesWith(this.body.mask, x, y)) {
      this.bounces--;
    }

    if (
      this.bounces === 0 ||
      !this.bounceTime ||
      this.time - this.bounceTime >= Meteor.explodeInterval
    ) {
      this.bounceTime = this.time;

      Level.instance.damage(
        new ExplosiveDamage(
          Math.round(this.position.x / 6) + 15,
          Math.round(this.position.y / 6) + 15,
          16,
          2,
          3 + Manager.instance.getElementValue(Element.Elemental)
        )
      );
    }

    if (this.bounces === 0) {
      Server.instance.kill(this);
    } else {
      Server.instance.dynamicUpdate(this);
    }
  };

  die() {
    Level.instance.remove(this);
    Level.instance.backgroundParticles.destroyEmitter(this.particles);
    Level.instance.cameraTarget.shake();
    this.character.setSpellSource(this, false);

    const texture = this.textures[this.sprite.currentFrame];
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      texture.baseTexture.resource.source as ImageBitmap,
      texture.frame.left,
      texture.frame.top,
      texture.frame.width,
      texture.frame.height,
      0,
      0,
      texture.frame.width,
      texture.frame.height
    );
    const collisionMask = CollisionMask.fromAlpha(
      ctx.getImageData(0, 0, 32, 32)
    );

    const x = Math.round(this.position.x / 6);
    const y = Math.round(this.position.y / 6);
    Level.instance.terrain.add(
      x,
      y,
      collisionMask,
      (ctx) => {
        ctx.drawImage(canvas, x, y);
      },
      () => {}
    );

    Manager.instance.setTurnState(TurnState.Ending);
  }

  getCenter(): [number, number] {
    return [this.position.x, this.position.y];
  }

  tick(dt: number) {
    this.time += dt;
    if (
      this.bounceTime &&
      this.time - this.bounceTime > Meteor.explodeInterval + dt
    ) {
      this.bounces = Meteor.bounces;
      this.bounceTime = 0;
    }

    if (this.time >= Meteor.moveTime) {
      this.body.tick(dt);
      const [x, y] = this.body.precisePosition;
      this.position.set(x * 6, y * 6);
      this.sound?.update([this.position.x, this.position.y]);

      if (
        Level.instance.terrain.killbox.collidesWith(
          this.body.mask,
          this.position.x,
          this.position.y
        )
      ) {
        Server.instance.kill(this);
      }
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<Meteor["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.time,
      this.direction,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<Meteor["serializeCreate"]>) {
    return new Meteor(
      data[0],
      data[1],
      data[2],
      data[3],
      Level.instance.entityMap.get(data[4]) as Character
    );
  }

  static cast(x: number, y: number, _: HurtableEntity, character: Character) {
    if (!Server.instance) {
      return;
    }

    const maxAngle =
      character.direction === 1 ? -Math.PI / 4 : Math.PI + Math.PI / 4;
    const maxX = Math.tan(maxAngle) * y;
    const _x = Math.max(0, Math.min(Level.instance.terrain.width, x + maxX));

    const angle = getAngle(_x, -32, x - 32, y - 32);
    const entity = new Meteor(_x, -32, 0, angle, character);

    Server.instance.create(entity);
    Server.instance.focus(entity);
    return entity;
  }
}
