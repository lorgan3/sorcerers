import { AnimatedSprite, Container, Text } from "pixi.js";
import { Level } from "../map/level";
import { Body } from "../collision/body";
import { Controller, Key } from "../controller/controller";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { ellipse9x16 } from "../collision/precomputed/circles";
import { Player } from "../network/player";
import { Force, TargetList } from "../damage/targetList";
import { HurtableEntity } from "./types";
import { GenericDamage } from "../damage/genericDamage";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { DamageSource } from "../damage/types";
import { SimpleParticleEmitter } from "../../grapics/particles/simpleParticleEmitter";
import { ParticleEmitter } from "../../grapics/particles/types";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 5;

export class Character extends Container implements HurtableEntity {
  public readonly body: Body;
  public id = -1;

  private sprite: AnimatedSprite;
  private wings: AnimatedSprite;
  private namePlate: Text;
  private particles?: ParticleEmitter;

  private _hp = 100;
  private time = 0;
  private damageSource: DamageSource | null = null;
  private hasWings = false;

  constructor(
    public readonly player: Player,
    x: number,
    y: number,
    public readonly name: string
  ) {
    super();

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: ellipse9x16,
      onCollide: this.onCollide,
    });
    this.body.move(x, y);
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["wizard_walk"]);
    this.sprite.animationSpeed = 0.08;
    this.sprite.play();
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.position.set(26, 32);
    this.sprite.scale.set(0.4);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(ellipse9x16Canvas.data, 9, 16)
    // );
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.namePlate = new Text(`${name} ${this._hp}`, {
      fontFamily: "Eternal",
      fontSize: 32,
      fill: this.player.color,
      dropShadow: true,
      dropShadowDistance: 4,
      dropShadowAngle: 45,
    });
    this.namePlate.anchor.set(0.5);
    this.namePlate.position.set(25, -70);

    this.wings = new AnimatedSprite(atlas.animations["wings"]);
    this.wings.scale.set(4);
    this.wings.position.set(26, 32);
    this.wings.anchor.set(0.5);
    this.wings.animationSpeed = 0.2;
    this.wings.visible = false;

    this.addChild(this.wings, this.sprite, this.namePlate);
  }

  private onCollide = (x: number, y: number) => {
    if (
      Math.abs(this.body.xVelocity) > BOUNCE_TRIGGER ||
      Math.abs(this.body.yVelocity) > BOUNCE_TRIGGER
    ) {
      const velocity = this.body.velocity;
      const [x, y] = this.getCenter();

      this.damageSource = new ExplosiveDamage(
        x / 6 + this.body.xVelocity / 2,
        y / 6 + this.body.yVelocity / 2,
        velocity > 8 ? 12 : 8,
        velocity * 0.6,
        2
      );
    }
  };

  getCenter(): [number, number] {
    return [this.position.x + 27, this.position.y + 48];
  }

  tick(dt: number) {
    this.time += dt;
    if (this.time > 3) {
      this.body.active = 1;
    }

    if (this.body.active) {
      this.time = 0;

      Level.instance.terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.position
      );

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);

        if (this.damageSource) {
          Level.instance.damage(this.damageSource);
          this.damageSource = null;
        }

        if (
          Level.instance.terrain.killbox.collidesWith(
            this.body.mask,
            this.position.x,
            this.position.y
          )
        ) {
          Level.instance.damage(
            new GenericDamage(new TargetList().add(this, 999))
          );
        }
      }

      Level.instance.terrain.characterMask.add(
        this.body.mask,
        ...this.body.position
      );
    }
  }

  control(controller: Controller) {
    if (
      this.body.grounded &&
      !this.hasWings &&
      (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W))
    ) {
      this.body.jump();
    }
  }

  controlContinuous(dt: number, controller: Controller) {
    this.control(controller);

    if (controller.isKeyDown(Key.Left) || controller.isKeyDown(Key.A)) {
      this.body.walk(dt, -1);
      this.sprite.scale.x = -0.4;
    }

    if (controller.isKeyDown(Key.Right) || controller.isKeyDown(Key.D)) {
      this.body.walk(dt, 1);
      this.sprite.scale.x = 0.4;
    }

    if (this.hasWings) {
      if (
        (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W)) &&
        this.body.yVelocity > -1.5
      ) {
        this.body.addVelocity(0, -0.6 * dt);
      } else {
        this.body.addVelocity(0, -0.2 * dt);
      }
    }
  }

  damage(damage: number, force?: Force) {
    this.hp -= damage;

    Level.instance.damageNumberContainer.add(damage, ...this.getCenter());

    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.body.deserialize(data);

    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  die() {
    Level.instance.terrain.characterMask.subtract(
      this.body.mask,
      ...this.body.position
    );

    this.player.removeCharacter(this);
  }

  giveWings() {
    this.hasWings = true;
    this.wings.visible = true;
    this.wings.play();

    if (this.particles) {
      Level.instance.particleContainer.destroyEmitter(this.particles, true);
    }

    this.particles = new SimpleParticleEmitter(
      AssetsContainer.instance.assets!["atlas"].animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 64,
        spawnFrequency: 0.2,
        initialize: () =>
          Math.random() > 0.5
            ? {
                x: this.position.x - 32,
                y: this.position.y + 60,
                xVelocity: -2,
                yVelocity: 2,
              }
            : {
                x: this.position.x + 86,
                y: this.position.y + 60,
                xVelocity: 2,
                yVelocity: 2,
              },
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  removeWings() {
    if (!this.hasWings) {
      return;
    }

    this.hasWings = false;
    this.wings.visible = false;
    this.wings.stop();

    Level.instance.particleContainer.destroyEmitter(this.particles!);
    this.particles = undefined;
  }

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    this._hp = hp;
    this.namePlate.text = `${this.name} ${Math.ceil(this._hp)}`;
    this.body.active = 1;
  }
}
