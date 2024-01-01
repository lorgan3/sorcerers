import { AnimatedSprite, Container, Text } from "pixi.js";
import { Level } from "./map/level";
import { Body } from "./collision/body";
import { Controller, Key } from "./controller/controller";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { ellipse9x16 } from "./collision/precomputed/circles";
import { Player } from "./network/player";
import { Force, TargetList } from "./damage/targetList";
import { HurtableEntity } from "./map/types";
import { GenericDamage } from "./damage/genericDamage";
import { ExplosiveDamage } from "./damage/explosiveDamage";

// Start bouncing when impact is greater than this value
const BOUNCE_TRIGGER = 6;

export class Character extends Container implements HurtableEntity {
  public readonly body: Body;
  private sprite!: AnimatedSprite;
  private namePlate: Text;

  private _hp = 100;
  private time = 0;
  public hurt = false;

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

    this.addChild(this.sprite, this.namePlate);
  }

  private onCollide = (x: number, y: number) => {
    if (this.body.velocity > BOUNCE_TRIGGER) {
      const [x, y] = this.getCenter();

      Level.instance.damage(
        new ExplosiveDamage(
          x / 6 + this.body.xVelocity / 2,
          y / 6 + this.body.yVelocity / 2,
          8,
          this.body.velocity,
          1
        )
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

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    this._hp = hp;
    this.namePlate.text = `${this.name} ${Math.ceil(this._hp)}`;
    this.body.active = 1;
    this.hurt = true;

    if (this._hp <= 0) {
      this.player.removeCharacter(this);
    }
  }
}
