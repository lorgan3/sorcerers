import { sound } from "@pixi/sound";

export enum Sound {
}

interface SoundData {
  key: `${Sound}_${string}`;
  src: string;
  volume: number;
}

const SOUND_DATA: Partial<Record<Sound, SoundData[]>> = {};

const addSoundData = (key: Sound, src: string, volume = 1) => {
  if (!(key in SOUND_DATA)) {
    SOUND_DATA[key] = [];
  }

  SOUND_DATA[key]!.push({
    key: `${key}_${SOUND_DATA[key]!.length}`,
    src: `${import.meta.env.BASE_URL}sound/${src}.mp3`,
    volume,
  });
};

export const SOUND_ASSETS = Object.fromEntries(
  Object.values(SOUND_DATA).reduce(
    (all, variants) =>
      all.concat(variants.map((variant) => [variant.key, variant.src])),
    [] as Array<[string, string]>
  )
);

export const getRandomSound = (sound: Sound) =>
  SOUND_DATA[sound]![Math.floor(SOUND_DATA[sound]!.length * Math.random())];

export const fade = (alias: Sound, duration = 0.5) => {
  return new Promise<void>((resolve) => {
    const s = sound.find(alias);
    const initialVolume = s.volume;
    const step = initialVolume / duration / 20;

    const timer = window.setInterval(() => {
      s.volume -= step;

      if (s.volume <= 0) {
        s.stop();
        window.clearInterval(timer);
        resolve();
      }
    }, 50);
  });
};
