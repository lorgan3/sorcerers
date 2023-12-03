import { AnimatedSprite, Container, Sprite, Texture } from "pixi.js";
import { Level } from "./level";
import { Body } from "./collision/body";
import { Controller, Key } from "./controller/controller";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { Fireball } from "./spells/fireball";
import { circle9x9, circle9x9Canvas } from "./collision/precomputed/circles";
import { Range } from "./range";

export class Character extends Container {
  public readonly body: Body;
  private sprite!: AnimatedSprite;

  private range: Range;

  constructor(x: number, y: number) {
    super();

    this.body = new Body(Level.instance.terrain.collisionMask, {
      mask: circle9x9,
    });
    this.body.x = x;
    this.body.y = y;

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["wizard_walk"]);
    this.sprite.animationSpeed = 0.08;
    this.sprite.play();
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.x = 25;
    this.sprite.scale.set(0.4);

    const sprite2 = new Sprite(Texture.fromBuffer(circle9x9Canvas.data, 9, 9));
    sprite2.anchor.set(0);
    sprite2.scale.set(6);

    this.range = new Range(27, 27, 14);
    this.addChild(this.sprite, sprite2, this.range);
  }

  tick(dt: number) {
    if (this.body.tick(dt)) {
      this.position.set(this.body.x * 6, this.body.y * 6);

      Level.instance.terrain.characterMask.subtract(
        this.body.mask,
        ...this.body.oldLocation
      );
      Level.instance.terrain.characterMask.add(
        this.body.mask,
        ...this.body.location
      );
    }
  }

  control(controller: Controller) {
    if (this.body.grounded && controller.isKeyDown(Key.Up)) {
      this.body.jump();
    }

    if (controller.isKeyDown(Key.M1)) {
      this.range.update(...controller.getMouse());
    } else if (this.range.stop() && this.range.power > 0) {
      const fireball = new Fireball(
        this.body.x + 3 + Math.cos(this.range.rotation) * 6,
        this.body.y + 3 + Math.sin(this.range.rotation) * 6
      );
      fireball.body.addAngularVelocity(
        this.range.power * 5,
        this.range.rotation
      );
      Level.instance.add(fireball);
    }
  }

  controlContinuous(dt: number, controller: Controller) {
    this.control(controller);

    if (controller.isKeyDown(Key.Left)) {
      this.body.walk(dt, -1);
      this.sprite.scale.x = -0.4;
    }

    if (controller.isKeyDown(Key.Right)) {
      this.body.walk(dt, 1);
      this.sprite.scale.x = 0.4;
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }
}
