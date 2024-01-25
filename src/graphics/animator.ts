import { AnimatedSprite, Texture } from "pixi.js";

export interface Animation<K extends string> {
  name: string;
  loop: boolean;
  speed: number;
  blocking?: boolean;
  nextState?: K;
  available?: () => boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

export class Animator<K extends string = string> {
  private animations: Partial<Record<K, Animation<K>>> = {};
  private state?: K;
  private defaultState?: K;

  public readonly sprite: AnimatedSprite;

  constructor(private atlas: Record<string, Texture[]>) {
    this.sprite = new AnimatedSprite([Texture.EMPTY]);
    this.sprite.onComplete = this.onComplete;
  }

  private onComplete = () => {
    const config = this.animations[this.state!]!;

    if (config.nextState) {
      const nextConfig = this.animations[config.nextState]!;

      if (!nextConfig.available || nextConfig.available()) {
        this.animate(config.nextState, true);
        return;
      }
    }

    this.animate(this.defaultState!, true);
  };

  addAnimation(name: K, data: Animation<K>) {
    this.animations[name] = data;

    if (!this.defaultState) {
      this.defaultState = name;
      this.animate(name);
    }

    return this;
  }

  addAnimations(animations: Partial<Record<K, Animation<K>>>) {
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
    if (!force && (this.state === name || oldConfig?.blocking)) {
      return;
    }

    if (oldConfig?.onEnd) {
      oldConfig.onEnd();
    }

    this.state = name;
    const config = this.animations[name]!;
    this.sprite.textures = this.atlas[config.name];
    this.sprite.currentFrame =
      config.speed > 0 ? 0 : this.sprite.totalFrames - 1;
    this.sprite.loop = config.loop;
    this.sprite.animationSpeed = config.speed;

    this.sprite.play();

    if (config.onStart) {
      config.onStart();
    }
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
