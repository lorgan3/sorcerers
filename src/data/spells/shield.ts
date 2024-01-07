import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Projectile } from ".";
import { Character } from "../entity/character";
import { CollisionMask } from "../collision/collisionMask";
import { rotatedRectangle6x24 } from "../collision/precomputed/rectangles";
import { getIndexFromAngle } from "../collision/util";
import { Level } from "../map/level";
import { EntityType, HurtableEntity } from "../entity/types";
import { StaticBody } from "../collision/staticBody";
import { Server } from "../network/server";

const ANIMATION_SPEED = 0.1;
const FLICKER_SPEED = 0.5;
const FLICKER_DURATION = 30;

export class Shield extends Container implements Projectile, HurtableEntity {
  private sprite: AnimatedSprite;
  public readonly body: StaticBody;
  public id = -1;
  public readonly type = EntityType.Shield;

  private _hp = 100;
  private shieldArea: CollisionMask;
  private flickerTime = 0;

  constructor(x: number, y: number, angle: number) {
    super();
    this.position.set(x * 6, y * 6);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["shield"]);
    this.sprite.animationSpeed = ANIMATION_SPEED;
    this.sprite.play();
    this.sprite.scale.set(3);
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(70, 70);
    this.sprite.rotation = angle;

    const index = getIndexFromAngle(this.sprite.rotation - Math.PI / 2);
    this.body = new StaticBody(Level.instance.terrain.characterMask, {
      mask: rotatedRectangle6x24[index],
    });
    this.body.move(x, y);

    this.shieldArea = Level.instance.terrain.collisionMask.difference(
      this.body.mask,
      ...this.body.position
    );

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(rotatedRectangle6x24Canvas[index].data, 24, 24)
    // );
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);

    this.addChild(this.sprite);
    this.add();
  }

  getCenter(): [number, number] {
    return [this.position.x + 96, this.position.y + 96];
  }

  die() {
    Level.instance.terrain.collisionMask.subtract(
      this.shieldArea,
      ...this.body.position
    );
    Level.instance.terrain.characterMask.subtract(
      this.shieldArea,
      ...this.body.position
    );
    Level.instance.remove(this);
  }

  get hp() {
    return this._hp;
  }

  set hp(hp: number) {
    this._hp = hp;
    this.flickerTime = FLICKER_DURATION;

    if (this._hp > 0) {
      // Terrain might be damaged so re-add the shield.
      this.add();
    }
  }

  damage(damage: number) {
    this.hp -= damage;
  }

  tick(dt: number) {
    if (this.flickerTime > 0) {
      this.flickerTime -= dt;
      this.sprite.animationSpeed =
        this.flickerTime > 0 ? FLICKER_SPEED : ANIMATION_SPEED;
    }
  }

  serialize() {
    return null;
  }

  deserialize(data: any) {}

  private add() {
    Level.instance.terrain.collisionMask.add(
      this.body.mask,
      ...this.body.position
    );
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  serializeCreate() {
    return [...this.body.position, this.sprite.rotation] as const;
  }

  static create(data: ReturnType<Shield["serializeCreate"]>) {
    return new Shield(...data);
  }

  static cast(x: number, y: number, character: Character) {
    if (!Server.instance) {
      return;
    }

    const [cx, cy] = character.body.precisePosition;
    const angle = Math.PI / 2 + Math.atan2(cy - y - 3, cx - x - 8);
    const entity = new Shield(x, y, angle);

    Server.instance.create(entity);
    return entity;
  }
}
