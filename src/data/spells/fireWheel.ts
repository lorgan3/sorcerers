import { AnimatedSprite, BitmapText, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { circle9x9 } from "../collision/precomputed/circles";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Character } from "../entity/character";

import { Explosion } from "../../graphics/explosion";
import { TurnState } from "../network/types";
import { EntityType, Layer, Priority, Syncable } from "../entity/types";
import { Element } from "./types";
import { getLevel, getManager, getServer } from "../context";

import { StickyBody } from "../collision/stickyBody";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { CollisionMask } from "../collision/collisionMask";

export class FireWheel extends Container implements Syncable {
  private static baseLifeTime = 450;

  public readonly body: StickyBody;
  private sprite: AnimatedSprite;
  private text: BitmapText;
  private lifetime = 0;
  private sound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.FireWheel;
  public readonly priority = Priority.High;
  public layer = Layer.Background;

  constructor(
    x: number,
    y: number,
    speed: number,
    private direction: number,
    private character: Character,
    private collisionMask: CollisionMask
  ) {
    super();

    this.lifetime =
      FireWheel.baseLifeTime *
      (0.5 + 0.5 * getManager().getElementValue(Element.Arcane));

    this.body = new StickyBody(collisionMask, {
      mask: circle9x9,
      velocity: 2,
    });
    this.body.move(x, y);
    this.body.addAngularVelocity(speed, direction);
    this.position.set(x * 6, y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.Fire);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_wheel"]);
    this.sprite.animationSpeed = 0.1;
    this.sprite.scale.set(3);
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(3);

    this.text = new BitmapText({
      text: this.seconds,
      style: {
        fontFamily: "Eternal",
        fontSize: 32,
      },
    });
    this.text.position.set(-40, -40);
    this.text.tint = this.character.player.color;
    this.text.visible = false;

    // const canvas = new OffscreenCanvas(1, 1);
    // const ctx = canvas.getContext("2d")!;

    // ctx.fillStyle = "#000000";
    // ctx.fillRect(0, 0, 1, 1);

    // const sprite = new Sprite(Texture.from(canvas));
    // sprite.scale.set(6);

    // const sprite2 = new Sprite(
    //   Texture.fromBuffer(circle16x16Canvas.data, 16, 16)
    // );
    // sprite2.anchor.set(0);
    // sprite2.scale.set(6);
    // sprite2.alpha = 0.5;
    // sprite2.position.set(-48);

    this.addChild(this.sprite, this.text);

    // When spawning in a wall
    if (
      getServer() &&
      this.collisionMask.collidesWithPoint(
        ...this.body.position
      )
    ) {
      this.lifetime = 0;
    }
  }

  private _die(x: number, y: number) {
    getServer()!.damage(
      new ExplosiveDamage(
        x,
        y,
        16,
        3,
        3 + getManager().getElementValue(Element.Elemental) * 2.5
      ),
      this.character.player
    );
    getServer()!.kill(this);
  }

  die() {
    getLevel().remove(this);
    new Explosion(this.position.x, this.position.y);
    getManager().setTurnState(TurnState.Ending);
    this.sound?.destroy();
  }

  getCenter(): [number, number] {
    return [this.position.x + 6, this.position.y + 6];
  }

  tick(dt: number) {
    this.body.tick(dt);
    this.sprite.scale.x = this.body.direction * 3;
    const [x, y] = this.body.precisePosition;
    this.position.set(x * 6, y * 6);

    if (this.body.sticky) {
      if (this.sound?.alias !== Sound.Burn) {
        this.sound?.destroy();
        this.sound = undefined;
      }

      if (!this.sound) {
        this.sound = ControllableSound.fromEntity(this, Sound.Burn, {
          loop: true,
        });
      } else {
        this.sound.update(this);
      }
    }

    if (this.seconds < 10) {
      this.text.text = this.seconds;
      this.text.visible = true;
    }

    this.lifetime -= dt;
    if (!getServer()) {
      return;
    }

    if (
      this.lifetime <= 0 ||
      getLevel().terrain.killbox.collidesWith(
        this.body.mask,
        ...this.getCenter()
      )
    ) {
      this._die(x, y);
      return;
    }

    const [cx, cy] = this.getCenter();
    getLevel().withNearbyEntities(cx, cy, 10 * 6, (entity) => {
      if (entity instanceof Character) {
        this._die(x, y);
        return true;
      }
    });
  }

  private get seconds() {
    return Math.floor(this.lifetime / 30);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: ReturnType<FireWheel["serialize"]>) {
    this.body.deserialize(data);
  }

  serializeCreate() {
    return [
      ...this.body.precisePosition,
      this.body.velocity,
      this.direction,
      this.character.id,
    ] as const;
  }

  static create(data: ReturnType<FireWheel["serializeCreate"]>) {
    return new FireWheel(
      data[0],
      data[1],
      data[2],
      data[3],
      getLevel().entityMap.get(data[4]) as Character,
      getLevel().terrain.collisionMask
    );
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    power: number,
    direction: number
  ) {
    if (!getServer()) {
      return;
    }

    const entity = new FireWheel(x, y, power * 1.5, direction, character, getLevel().terrain.collisionMask);

    getServer()!.create(entity);
    getServer()!.focus(entity);
    return entity;
  }
}
