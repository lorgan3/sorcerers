import { filters, IMediaInstance, PlayOptions, sound } from "@pixi/sound";
import { getRandomSound, Sound } from ".";
import { HurtableEntity } from "../data/entity/types";
import { Level } from "../data/map/level";

class ControllableSound {
  private ref?: IMediaInstance;
  private promise?: Promise<IMediaInstance>;

  private static soundInstanceCountMap = new Map<Sound, number>();
  private static soundPlaytimeMap = new Map<Sound, number>();

  static MAX_INSTANCES = 3;
  static MIN_INTERVAL = 100;

  private static rateLimitSound(alias: Sound) {
    const instanceCount = this.soundInstanceCountMap.get(alias) || 0;
    const playtime = this.soundPlaytimeMap.get(alias) || 0;

    if (instanceCount > this.MAX_INSTANCES) {
      return true;
    }

    const now = performance.now();
    if (playtime + this.MIN_INTERVAL > now) {
      return true;
    }

    // Don't forget to manually decrement this when the sound finishes playing!
    this.soundInstanceCountMap.set(alias, instanceCount + 1);
    this.soundPlaytimeMap.set(alias, now);

    return false;
  }

  static getSoundOptions(cx: number, cy: number) {
    const { x, y, width, height, scale } = Level.instance.getViewport();
    const horizontalDirection = (cx - x) / (width / 2);
    const verticalDirection = (cy - y) / (height / 2);

    const overflow =
      1 /
      (1 +
        (Math.max(0, Math.abs(horizontalDirection) - 1) +
          Math.max(0, Math.abs(verticalDirection) - 1)) *
          3);
    const volume = (Math.min(scale, 1) / 1) * overflow;

    const pan =
      Math.min(1, Math.max(0, Math.abs(horizontalDirection) - 0.5)) *
      Math.sign(horizontalDirection);

    return { volume, pan };
  }

  static fromEntity(
    entity: HurtableEntity | [number, number],
    alias: Sound,
    options?: PlayOptions
  ) {
    const { volume, pan } = ControllableSound.getSoundOptions(
      ...("getCenter" in entity ? entity.getCenter() : entity)
    );

    // Sounds that are too quiet are not played.
    if (volume < 0.25) {
      return;
    }

    if (this.rateLimitSound(alias)) {
      return;
    }

    return new ControllableSound(alias, new filters.StereoFilter(pan), {
      ...options,
      volume: volume,
    });
  }

  constructor(
    private alias: Sound,
    private filter: filters.StereoFilter,
    options: PlayOptions
  ) {
    const soundData = getRandomSound(alias);
    const promiseOrRef = sound.play(soundData.key, {
      ...options,
      volume: soundData.volume * (options.volume || 1),
      filters: [filter],
      speed: 0.9 + Math.random() / 5,
      complete: () =>
        ControllableSound.soundInstanceCountMap.set(
          alias,
          ControllableSound.soundInstanceCountMap.get(alias)! - 1
        ),
    });

    if (promiseOrRef instanceof Promise) {
      promiseOrRef.then((ref) => (this.ref = ref));
      this.promise = promiseOrRef;
    } else {
      this.ref = promiseOrRef;
    }
  }

  destroy() {
    if (this.ref) {
      this.ref?.destroy();
    } else {
      this.promise!.then((ref) => ref.destroy());
    }

    ControllableSound.soundInstanceCountMap.set(
      this.alias,
      ControllableSound.soundInstanceCountMap.get(this.alias)! - 1
    );
  }

  update(entity: HurtableEntity | [number, number]) {
    if (this.ref) {
      const { volume, pan } = ControllableSound.getSoundOptions(
        ...("getCenter" in entity ? entity.getCenter() : entity)
      );
      this.ref.volume = volume;
      this.filter.pan = pan;
    }
  }

  fade(dt: number, duration = 500) {
    if (!this.ref) {
      return false;
    }

    this.ref.volume -= (dt / duration) * 0.8;

    if (this.ref.volume < 0.2) {
      this.destroy();
      return true;
    }

    return false;
  }
}

export { ControllableSound };
