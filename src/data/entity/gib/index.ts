import { Sprite, Texture } from "pixi.js";
import { CollisionMask } from "../../collision/collisionMask";
import { SimpleBody } from "../../collision/simpleBody";
import { TickingEntity } from "../types";
import { getLevel } from "../../context";

export interface GibConfig {
  texture: Texture;
  offsetX: number;
  offsetY: number;
  mask: CollisionMask;
  maskSprite?: Sprite;
  bloody?: boolean;
}

const OFF_MAP_BUFFER = 20;
const SURFACE_BAND = 2;
const SURFACE_X_DRAG = 0.92;
const SURFACE_LERP = 0.1;
const SURFACE_YV_DAMP = 0.5;
const SURFACE_BOB_SPEED = 0.05;
const SURFACE_BOB_AMPLITUDE = 3;
const DEEP_BUOYANCY = 0.35;
const DEEP_Y_DRAG = 0.85;
const DEEP_X_DRAG = 0.85;
const BLEED_DURATION = 90;

export class Gib extends Sprite implements TickingEntity {
  public readonly body: SimpleBody;
  private bloody: boolean;
  private offsetX: number;
  private offsetY: number;
  private bleedTime: number;
  private bobTime = Math.random() * Math.PI * 2;
  private inSurface = false;

  constructor({
    texture,
    offsetX,
    offsetY,
    mask,
    maskSprite,
    bloody = false,
  }: GibConfig) {
    super(texture);
    this.bloody = bloody;
    this.bleedTime = bloody ? BLEED_DURATION : 0;
    this.offsetX = -offsetX * 2;
    this.offsetY = -offsetY * 2;

    this.body = new SimpleBody(getLevel().terrain.collisionMask, {
      mask,
      bounciness: -0.7,
      gravity: 0.25,
      friction: 0.96,
    });
    this.scale.set(2);
    this.position.set(offsetX, offsetY);

    if (maskSprite) {
      maskSprite.position.set(-offsetX, -offsetY);

      this.addChild(maskSprite);
    }
  }

  bleed() {
    if (this.bloody) {
      this.bleedTime = BLEED_DURATION;
    }
  }

  tick(dt: number) {
    this.body.tick(dt);

    const level = getLevel();
    const killboxLevel = level.terrain.killbox.level;
    let [x, y] = this.body.precisePosition;

    const depth = y + this.body.mask.height - killboxLevel;
    if (depth > SURFACE_BAND) {
      this.inSurface = false;
      this.body.yVelocity -= DEEP_BUOYANCY * dt;
      this.body.yVelocity *= DEEP_Y_DRAG;
      this.body.xVelocity *= DEEP_X_DRAG;
      this.body.active = 1;
    } else if (depth > 0) {
      this.inSurface = true;
      const targetY = killboxLevel - this.body.mask.height;
      this.body.yVelocity -= this.body.gravity * dt;
      this.body.yVelocity *= SURFACE_YV_DAMP;
      y = y + (targetY - y) * SURFACE_LERP * dt;
      this.body.move(x, y);
      this.body.xVelocity *= SURFACE_X_DRAG;
      this.body.active = 1;
    } else {
      this.inSurface = false;
    }

    let displayY = y * 6;
    if (depth > 0) {
      this.bobTime += dt * SURFACE_BOB_SPEED;
      displayY += Math.sin(this.bobTime) * SURFACE_BOB_AMPLITUDE;
    }

    this.position.set(x * 6, displayY);

    if (
      x < -OFF_MAP_BUFFER ||
      x > level.terrain.width + OFF_MAP_BUFFER
    ) {
      level.remove(this);
      return;
    }

    if (this.bleedTime > 0) {
      this.bleedTime -= dt;
      if (Math.random() > 0.8) {
        level.bloodEmitter.spawn(
          x * 6 + this.offsetX + (Math.random() - 0.5) * 4,
          y * 6 + this.offsetY + (Math.random() - 0.5) * 4,
          0,
          0
        );
      }
    }
  }
}
