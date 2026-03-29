import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Character } from "../entity/character";
import { CollisionMask } from "../collision/collisionMask";
import { rotatedRectangle6x24 } from "../collision/precomputed/rectangles";
import { getIndexFromAngle } from "../collision/util";
import {
  EntityType,
  HurtableEntity,
  Priority,
  Syncable,
} from "../entity/types";
import { StaticBody } from "../collision/staticBody";
import { DamageSource } from "../damage/types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";

export class Shield extends Container implements HurtableEntity, Syncable {
  private static spawnSpeed = 0.15;
  private static flickerSpeed = 0.25;
  private static baseHp = 30;

  private sprite: AnimatedSprite;
  private shineEffect: AnimatedSprite;

  public readonly body: StaticBody;
  public id = -1;
  public readonly type = EntityType.Shield;
  readonly priority = Priority.Dynamic;

  private _hp = 0;
  private shieldArea?: CollisionMask;
  private maskX = 0;
  private maskY = 0;

  constructor(x: number, y: number, private direction: number, hp?: number) {
    super();
    if (hp) {
      this._hp = hp;
    } else {
      this._hp =
        Shield.baseHp + getManager().getElementValue(Element.Physical) * 6;
    }

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_manaShield"]);
    this.sprite.animationSpeed = Shield.spawnSpeed;
    this.sprite.play();
    this.sprite.scale.set(-1.5, 1.5);
    this.sprite.anchor.set(0.6, 0.5);
    this.sprite.position.set(70, 70);
    this.sprite.rotation = direction - Math.PI / 2;
    this.sprite.loop = false;

    this.shineEffect = new AnimatedSprite(
      atlas.animations["spells_manaShieldShine"]
    );
    this.shineEffect.animationSpeed = Shield.flickerSpeed;
    this.shineEffect.scale.set(-1.5, 1.5);
    this.shineEffect.anchor.set(0.6, 0.5);
    this.shineEffect.position.set(70, 70);
    this.shineEffect.rotation = direction - Math.PI / 2;
    this.shineEffect.loop = false;
    this.shineEffect.visible = false;
    this.shineEffect.onComplete = () => {
      this.shineEffect.visible = false;
      this.sprite.visible = true;
    };

    const index = getIndexFromAngle(this.sprite.rotation);
    this.body = new StaticBody(getLevel().terrain.characterMask, {
      mask: rotatedRectangle6x24[index],
    });
    this.body.move(x, y);
    this.move();
    ControllableSound.fromEntity(this, Sound.Schwing);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(
    //     rotatedRectangle6x24Canvas[index]
    //       .getContext("2d")!
    //       .getImageData(0, 0, 24, 24).data,
    //     24,
    //     24
    //   )
    // );
    // sprite2.alpha = 0.3;
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite, this.shineEffect);
  }

  getCenter(): [number, number] {
    return [this.position.x + 70, this.position.y + 70];
  }

  die() {
    this.subtract();
    getLevel().remove(this);
    ControllableSound.fromEntity(this, Sound.Glass);
  }

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    this._hp = hp;
  }

  damage(source: DamageSource, damage: number) {
    this.hp -= damage;

    if (this._hp > 0) {
      this.sprite.visible = false;
      this.shineEffect.visible = true;
      this.shineEffect.currentFrame = 0;
      this.shineEffect.play();

      ControllableSound.fromEntity(this, Sound.Crack);

      this.add();
    }

    getLevel().bloodEmitter.burst(this, damage, source);
  }

  tick() {
    if (this.body.moved && getServer()) {
      this.move();
      getServer()!.dynamicUpdate(this);
    }
  }

  private move() {
    this.body.moved = false;
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    this.subtract();
    this.add();
  }

  private subtract() {
    if (!this.shieldArea) {
      return;
    }

    getLevel().terrain.characterMask.subtract(
      this.shieldArea,
      this.maskX,
      this.maskY
    );
  }

  private add() {
    [this.maskX, this.maskY] = this.body.position;
    this.shieldArea = getLevel().terrain.collisionMask.difference(
      this.body.mask,
      this.maskX,
      this.maskY
    );

    getLevel().terrain.characterMask.add(
      this.body.mask,
      this.maskX,
      this.maskY
    );
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<this["serialize"]>) {
    this.body.deserialize(data);
    this.move();
  }

  serializeCreate() {
    return [...this.body.position, this.direction, this.hp] as const;
  }

  static create(data: ReturnType<Shield["serializeCreate"]>) {
    return new Shield(...data);
  }

  static cast(x: number, y: number, character: Character, angle: number) {
    if (!getServer()) {
      return;
    }

    const entity = new Shield(x, y, angle - Math.PI / 2);

    getServer()!.create(entity);
    return entity;
  }
}
