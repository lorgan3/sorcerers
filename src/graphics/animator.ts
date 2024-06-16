import { AnimatedSprite, Texture } from "pixi.js";

export interface Animation<K extends string, S> {
  name: string;
  loop: boolean;
  speed: number;
  blocking?: boolean;
  nextState?: K;
  duration?: number;
  available?: (self: S) => boolean;
  onStart?: (self: S) => void;
  onEnd?: (self: S) => void;
  continuous?: (self: S, time: number) => number;
}

export class Animator<K extends string = string, S = any> {
  private animations: Partial<Record<K, Animation<K, S>>> = {};
  private state?: K;
  private defaultState?: K;
  private time = 0;
  private nextTime = 0;
  private completeTime = 0;

  public readonly sprite: AnimatedSprite;

  constructor(
    private atlas: Record<string, Texture[]>,
    private self: S,
    private variant = ""
  ) {
    this.sprite = new AnimatedSprite([Texture.EMPTY]);
    this.sprite.onComplete = this.onComplete;
  }

  private onComplete = () => {
    const config = this.animations[this.state!]!;

    // Animation is done but custom duration set.
    if (config.duration && this.time < this.completeTime) {
      return;
    }

    if (config.nextState) {
      const nextConfig = this.animations[config.nextState]!;

      if (!nextConfig.available || nextConfig.available(this.self)) {
        this.animate(config.nextState, true);
        return;
      }
    }

    this.animate(this.defaultState!, true);
  };

  addAnimation(name: K, data: Animation<K, S>) {
    this.animations[name] = data;

    if (!this.defaultState) {
      this.defaultState = name;
      this.animate(name);
    }

    return this;
  }

  addAnimations(animations: Partial<Record<K, Animation<K, S>>>) {
    this.animations = { ...this.animations, ...animations };

    if (!this.defaultState) {
      const name = Object.keys(animations)[0] as K;
      this.defaultState = name;
      this.animate(name);
    }

    return this;
  }

  animate(name = this.defaultState!, force = false) {
    const oldConfig = this.animations[this.state!];
    if (!force && oldConfig?.blocking) {
      return;
    }

    const config = this.animations[name]!;
    this.completeTime = config.duration ? this.time + config.duration : 0;
    if (!force && this.state === name) {
      return;
    }

    if (oldConfig?.onEnd) {
      oldConfig.onEnd(this.self);
    }

    this.time = 0;
    this.nextTime = 0;
    this.completeTime = config.duration || 0;
    this.state = name;
    this.sprite.textures = this.atlas[config.name + this.variant];
    this.sprite.currentFrame =
      config.speed > 0 ? 0 : this.sprite.totalFrames - 1;
    this.sprite.loop = config.loop;
    this.sprite.animationSpeed = config.speed;

    this.sprite.play();

    if (config.onStart) {
      config.onStart(this.self);
    }
  }

  tick(dt: number) {
    if (!this.state) {
      return;
    }

    const config = this.animations[this.state]!;

    if (config.duration && this.time >= this.completeTime) {
      this.onComplete();
    } else if (config.continuous && this.time >= this.nextTime) {
      this.nextTime = this.time + config.continuous(this.self, this.time);
    }

    this.time += dt;
  }

  setDefaultAnimation(name: K) {
    this.defaultState = name;
  }

  get animationState() {
    return this.state!;
  }

  get isBlocking() {
    return this.animations[this.state!]!.blocking;
  }
}
