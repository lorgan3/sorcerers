import { Container, TilingSprite } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { SimpleBody } from "../collision/simpleBody";

import { FallDamage, Shape } from "../damage/fallDamage";

import { EntityType, Spawnable } from "../entity/types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getRandom } from "../../util/array";
import { rectangle1x6 } from "../collision/precomputed/rectangles";
import { map } from "../../util/math";
import { SpawnPoint } from "../../graphics/spawnPoint";

export class SmallSword extends Container implements Spawnable {
  private static shakeIntensity = 3;
  private static fadeTime = 30;
  private static lifeTime = 180;
  private static spriteYOffset = 36;
  private static spawnTime = 40;

  public readonly body: SimpleBody;
  private sprite!: TilingSprite;
  private bounces = 8;
  private lastY?: number;
  private time = 0;

  private spawnPoint: SpawnPoint;

  public dead = false;
  public id = -1;
  public readonly type = EntityType.SmallSword;

  private shakeXOffset = 0;
  private shakeYOffset = 0;
  private fallingSound?: ControllableSound;

  constructor(x: number, y: number) {
    super();

    this.spawnPoint = new SpawnPoint(x * 6 + 3, y * 6 - 18);
    Level.instance.add(this.spawnPoint);

    this.body = new SimpleBody(Level.instance.terrain.characterMask, {
      mask: rectangle1x6,
      onCollide: this.onCollide,
      bounciness: 0.7,
      friction: 0.9,
      gravity: 0.2,
    });
    this.body.move(Math.round(x), y);

    const atlas = AssetsContainer.instance.assets!["atlas"];
    const frames = atlas.animations["spells_sword"];

    this.sprite = new TilingSprite({
      texture: getRandom(frames),
      width: frames[0].width,
      height: 0,
    });
    this.sprite.position.set(-7, SmallSword.spriteYOffset - frames[0].height);
    this.sprite.scale.y = -1;

    // const sprite2 = new Sprite(Texture.from(rectangle1x6Canvas));
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;

    this.addChild(this.sprite);
  }

  private onCollide = (x: number, y: number) => {
    if ((this.lastY && Math.abs(this.lastY - y) < 1) || this.dead) {
      return;
    }

    this.bounces--;
    this.lastY = y;
    this.shakeXOffset =
      Math.random() * SmallSword.shakeIntensity - SmallSword.shakeIntensity / 2;
    this.shakeYOffset =
      Math.random() * SmallSword.shakeIntensity - SmallSword.shakeIntensity / 2;

    const damage = new FallDamage(x - 1, y - 2, Shape.SmallSword, 8);
    Level.instance.damage(damage);
    ControllableSound.fromEntity(
      [this.position.x, this.position.y],
      Sound.Step
    );

    if (this.bounces <= 0 || damage.getTargets().getEntities().length) {
      this.dead = true;
      this.body.bounciness = 0;
    }
  };

  getCenter(): [number, number] {
    return [this.position.x - 7, this.position.y + 36];
  }

  tick(dt: number) {
    this.time += dt;
    this.sprite.height =
      this.sprite.texture.height *
      Math.min(1, this.time / SmallSword.spawnTime);

    this.sprite.position.y =
      SmallSword.spriteYOffset -
      this.sprite.texture.height +
      this.sprite.height;

    if (this.time >= SmallSword.spawnTime) {
      if (!this.fallingSound) {
        this.fallingSound = ControllableSound.fromEntity(this, Sound.Arrow);
      }

      this.body.tick(dt);

      this.spawnPoint.alpha -= dt * 0.02;
    }

    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6 + this.shakeXOffset, y * 6 + this.shakeYOffset);

    this.fallingSound?.update([this.position.x, this.position.y]);

    if (this.time > SmallSword.lifeTime) {
      this.die();
    }

    if (SmallSword.lifeTime - this.time <= SmallSword.fadeTime) {
      this.sprite.alpha = map(
        0.2,
        1,
        (SmallSword.lifeTime - this.time) / SmallSword.fadeTime
      );
    }
  }

  die() {
    this.dead = true;
    Level.instance.remove(this, this.spawnPoint);
  }

  serializeCreate() {
    return this.body.precisePosition;
  }

  static create(data: ReturnType<SmallSword["serializeCreate"]>) {
    return new SmallSword(...data);
  }
}
