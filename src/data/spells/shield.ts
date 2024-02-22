import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Character } from "../entity/character";
import { CollisionMask } from "../collision/collisionMask";
import { rotatedRectangle6x24 } from "../collision/precomputed/rectangles";
import { getIndexFromAngle } from "../collision/util";
import { Level } from "../map/level";
import { EntityType, HurtableEntity, Spawnable } from "../entity/types";
import { StaticBody } from "../collision/staticBody";
import { Server } from "../network/server";
import { DamageSource } from "../damage/types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class Shield extends Container implements HurtableEntity, Spawnable {
  private static spawnSpeed = 0.15;
  private static flickerSpeed = 0.25;

  private sprite: AnimatedSprite;
  private shineEffect: AnimatedSprite;

  public readonly body: StaticBody;
  public id = -1;
  public readonly type = EntityType.Shield;

  private _hp = 40;
  private shieldArea: CollisionMask;

  constructor(x: number, y: number, angle: number, hp: number) {
    super();
    this._hp = hp;
    this.position.set(x * 6, y * 6);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_manaShield"]);
    this.sprite.animationSpeed = Shield.spawnSpeed;
    this.sprite.play();
    this.sprite.scale.set(-1.5, 1.5);
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(60, 70);
    this.sprite.rotation = angle - Math.PI / 2;
    this.sprite.loop = false;

    this.shineEffect = new AnimatedSprite(
      atlas.animations["spells_manaShieldShine"]
    );
    this.shineEffect.animationSpeed = Shield.flickerSpeed;
    this.shineEffect.scale.set(-1.5, 1.5);
    this.shineEffect.anchor.set(0.5);
    this.shineEffect.position.set(60, 70);
    this.shineEffect.rotation = angle - Math.PI / 2;
    this.shineEffect.loop = false;
    this.shineEffect.visible = false;
    this.shineEffect.onComplete = () => {
      this.shineEffect.visible = false;
      this.sprite.visible = true;
    };

    const index = getIndexFromAngle(this.sprite.rotation);
    this.body = new StaticBody(Level.instance.terrain.characterMask, {
      mask: rotatedRectangle6x24[index],
    });
    this.body.move(x, y);

    this.shieldArea = Level.instance.terrain.collisionMask.difference(
      this.body.mask,
      ...this.body.position
    );

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
    this.add();
    ControllableSound.fromEntity(this, Sound.Schwing);
  }

  getCenter(): [number, number] {
    return [this.position.x + 72, this.position.y + 72];
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

    Level.instance.bloodEmitter.burst(this, damage, source);
  }

  tick(dt: number) {}

  private add() {
    // Level.instance.terrain.collisionMask.add(
    //   this.body.mask,
    //   ...this.body.position
    // );
    Level.instance.terrain.characterMask.add(
      this.body.mask,
      ...this.body.position
    );
  }

  serializeCreate() {
    return [...this.body.position, this.sprite.rotation, this.hp] as const;
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
    const entity = new Shield(x, y, angle, 100);

    Server.instance.create(entity);
    return entity;
  }
}
