import { Container, ImageBitmapResource, Texture, TilingSprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Character } from "../entity/character";
import { Level } from "../map/level";
import { EntityType, Layer, Spawnable } from "../entity/types";
import { Server } from "../network/server";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { probeX } from "../map/utils";
import { CollisionMask } from "../collision/collisionMask";
import { Manager } from "../network/manager";
import { TurnState } from "../network/types";

export class Rock extends Container implements Spawnable {
  private static growTime = 100;
  private static shakeIntensity = 8;
  private static maxHeightDiff = 24;

  private sprite: TilingSprite;
  private texture: Texture<ImageBitmapResource>;
  private canvas: OffscreenCanvas;
  private collisionMask: CollisionMask;
  private time = 0;
  private sound?: ControllableSound;

  public id = -1;
  public readonly type = EntityType.Shield;
  public readonly layer = Layer.Background;

  constructor(
    private _x: number,
    private _y: number,
    private targetHeight: number,
    private direction: number
  ) {
    super();

    this.texture =
      AssetsContainer.instance.assets!["atlas"].textures["spells_newRock"];

    this.canvas = new OffscreenCanvas(48, 48);
    const ctx = this.canvas.getContext("2d")!;
    ctx.scale(this.direction, 1);
    ctx.drawImage(
      this.texture.baseTexture.resource.source as ImageBitmap,
      this.texture.frame.left,
      this.texture.frame.top,
      this.texture.frame.width,
      this.targetHeight,
      0,
      0,
      this.texture.frame.width * this.direction,
      this.targetHeight
    );
    this.collisionMask = CollisionMask.fromAlpha(
      ctx.getImageData(0, 0, 48, 48)
    );

    this.sprite = new TilingSprite(this.texture, this.texture.width, 0);
    this.sprite.scale.set(6 * direction, 6);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.position.set(0, 23);

    this.position.set(_x * 6, _y * 6);
    this.sound = ControllableSound.fromEntity(this, Sound.Rumble);

    this.addChild(this.sprite);
  }

  getCenter(): [number, number] {
    return [this.position.x + 144, this.position.y + 144];
  }

  die() {
    Level.instance.remove(this);
    Manager.instance.setTurnState(TurnState.Ending);

    // @TODO this should fade instead
    this.sound?.destroy();

    Level.instance.terrain.add(
      this._x - this.texture.frame.width / 2,
      this._y - this.targetHeight + 4,
      this.collisionMask,
      (ctx) => {
        ctx.drawImage(
          this.canvas,
          this._x - this.texture.frame.width / 2,
          this._y - this.targetHeight + 4
        );
      },
      () => {}
    );
  }

  tick(dt: number) {
    this.time += dt;
    this.sprite.height =
      Math.min(1, this.time / Rock.growTime) * this.targetHeight;

    this.position.set(
      this._x * 6 +
        Math.random() * Rock.shakeIntensity -
        Rock.shakeIntensity / 2,
      this._y * 6
    );

    Level.instance.withNearbyEntities(
      this.position.x,
      this.position.y - 96,
      30 * 6,
      (entity) => {
        const [ex, ey] = entity.body.position;
        if (
          this.collisionMask.collidesWith(
            entity.body.mask,
            ex - (this._x - 24),
            ey - (this._y - 48 + 1) - 48 + Math.floor(this.sprite.height)
          )
        ) {
          // If you're deep in the rock, push harder so you take damage
          if (
            this.collisionMask.collidesWith(
              entity.body.mask,
              ex - (this._x - 24),
              ey - (this._y - 48 + 5) - 48 + Math.floor(this.sprite.height)
            )
          ) {
            entity.body.addVelocity(0, -10 * dt);
          } else {
            entity.body.addVelocity(0, -0.3 * dt);
          }
        }
      }
    );

    if (this.time >= Rock.growTime && Server.instance) {
      Server.instance.kill(this);
    }
  }

  serializeCreate() {
    return [
      this.position.x / 6,
      this.position.y / 6,
      this.targetHeight,
      this.direction,
    ] as const;
  }

  static create(data: ReturnType<Rock["serializeCreate"]>) {
    return new Rock(...data);
  }

  static cast(x: number, y: number, character: Character, power: number) {
    if (!Server.instance) {
      return;
    }

    const _x = Math.round(x) + character.direction * power * 12;

    let maxY = y + 8 - Rock.maxHeightDiff;
    let minY = y + 8 + Rock.maxHeightDiff;
    let diff = 0;
    for (let i = -24; i < 24; i++) {
      const _y = probeX(
        Level.instance.terrain.collisionMask,
        _x + i * character.direction,
        y + 8 - Rock.maxHeightDiff
      );

      minY = Math.min(_y, minY);
      maxY = Math.max(_y, maxY);
      diff = Math.abs(minY - maxY);
    }

    const entity = new Rock(
      Math.round(_x),
      Math.round(maxY),
      Rock.maxHeightDiff + Math.min(diff, Rock.maxHeightDiff),
      character.direction
    );

    Server.instance.create(entity);
    return entity;
  }
}
