import { AnimatedSprite, Sprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { PhysicsBody } from "../collision";
import { BaseItem } from "./baseItem";
import { EntityType } from "./types";
import { Character } from "./character";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { getLevel } from "../context";

export const FADE_DELAY = 70;
export const PULL_DURATION = 90;
const PULL_STRENGTH = 0.8;
const VORTEX_FRAME_COUNT = 18;
const VORTEX_ANIMATION_SPEED = -VORTEX_FRAME_COUNT / PULL_DURATION;

export class BlackHole extends BaseItem {
  public readonly type = EntityType.PocketBlackHole;

  private pullX = 0;
  private pullY = 0;
  private pullArmed = false;
  private vortexStarted = false;

  constructor(x: number, y: number, _appeared: boolean) {
    super(x, y, _appeared);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const sprite = new Sprite(atlas.textures["items_vortexBook"]);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(26, 30);
    sprite.scale.set(3);
    this.addChild(sprite);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }

  serializeCreate(): [number, number, boolean] {
    return [...this.body.precisePosition, this._appeared];
  }

  static create(data: ReturnType<BlackHole["serializeCreate"]>): BlackHole {
    return new BlackHole(...data);
  }

  activate(character?: Character) {
    super.activate(character);

    if (character) {
      const [cx, cy] = character.getCenter();
      this.pullX = cx;
      this.pullY = cy;
      this.pullArmed = true;
    }
  }

  tick(dt: number) {
    if (this.pullArmed && this.activateTime >= 0) {
      const activeTime = this.time - this.activateTime;

      if (activeTime >= FADE_DELAY) {
        if (!this.vortexStarted) {
          this.startVortex();
          this.vortexStarted = true;
        }

        if (activeTime < FADE_DELAY + PULL_DURATION) {
          this.applyPull(dt);
        } else {
          this.pullArmed = false;
        }
      }
    }

    super.tick(dt);
  }

  private startVortex() {
    const atlas = AssetsContainer.instance.assets!["atlas"];
    const [ix, iy] = this.getCenter();

    const vortex = new AnimatedSprite(atlas.animations["vortexCollapse"]);
    vortex.anchor.set(0.5);
    vortex.position.set(ix, iy);
    vortex.scale.set(6);
    vortex.loop = false;
    vortex.animationSpeed = VORTEX_ANIMATION_SPEED;
    vortex.gotoAndPlay(vortex.totalFrames - 1);
    vortex.onComplete = () => getLevel().remove(vortex);

    getLevel().add(vortex);

    ControllableSound.fromEntity([ix, iy], Sound.Vortex);
  }

  private applyPull(dt: number) {
    const level = getLevel();

    for (const entity of level.entities) {
      if (entity === this || !(entity instanceof BaseItem) || entity.activated) {
        continue;
      }
      this.pullTarget(entity.body, ...entity.getCenter(), dt);
    }

    for (const gib of level.gibs) {
      const [gx, gy] = gib.getCenter();
      this.pullTarget(gib.body, gx, gy, dt);
    }
  }

  private pullTarget(
    body: PhysicsBody,
    ex: number,
    ey: number,
    dt: number,
  ) {
    const dx = this.pullX - ex;
    const dy = this.pullY - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      return;
    }
    const ux = dx / len;
    const uy = dy / len;
    body.addVelocity(ux * PULL_STRENGTH * dt, uy * PULL_STRENGTH * dt);
  }
}
