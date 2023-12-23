import { AnimatedSprite, Container, Text } from "pixi.js";
import { Level } from "./map/level";
import { Body } from "./collision/body";
import { Controller, Key } from "./controller/controller";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { Fireball } from "./spells/fireball";
import { ellipse9x16 } from "./collision/precomputed/circles";
import { Range } from "./range";
import { Manager } from "./network/manager";

export class Character extends Container {
  public readonly body: Body;
  private sprite!: AnimatedSprite;
  private namePlate: Text;

  private range: Range;
  private _hp = 100;
  public attacked = false;

  constructor(x: number, y: number, public readonly name: string) {
    super();

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: ellipse9x16,
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

    this.range = new Range(27, 50, 14);

    this.namePlate = new Text(`${name} ${this._hp}`, {
      fontFamily: "Eternal",
      fontSize: 32,
      fill: 0xffffff,
      dropShadow: true,
      dropShadowDistance: 4,
      dropShadowAngle: 45,
    });
    this.namePlate.anchor.set(0.5);
    this.namePlate.position.set(25, -70);

    this.addChild(this.sprite, this.range, this.namePlate);
  }

  tick(dt: number) {
    if (this.body.active) {
      Level.instance.terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.position
      );

      this.body.tick(dt);

      Level.instance.terrain.characterMask.add(
        this.body.mask,
        ...this.body.position
      );
    }

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);
  }

  control(controller: Controller) {
    if (
      this.body.grounded &&
      (controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W))
    ) {
      this.body.jump();
    }

    if (this.attacked) {
      return;
    }

    if (controller.isKeyDown(Key.M1)) {
      this.range.update(...controller.getMouse());
    } else if (this.range.stop() && this.range.power > 0) {
      this.attacked = true;
      const [x, y] = this.body.precisePosition;
      const fireball = new Fireball(
        x + 3 + Math.cos(this.range.rotation) * 7,
        y + 6.5 + Math.sin(this.range.rotation) * 10.5
      );
      fireball.body.addAngularVelocity(
        this.range.power * 5,
        this.range.rotation
      );
      Level.instance.add(fireball);

      Manager.instance.endTurn();
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
  }
}
