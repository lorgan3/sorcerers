import { sound } from "@pixi/sound";

export enum Sound {
  Jump = "jumpSnd",
  Land = "landSnd",
  Step = "stepSnd",
  Swing = "swingSnd",
  Pop = "popSnd",
  Potion = "potionSnd",
  Splat = "splatSnd",
  BigSplat = "bigSplatSnd",
  Stone = "stoneSnd",
  Choir = "choirSnd",
  Bomb = "bombSnd",
  Explosion = "explosionSnd",
  Fire = "fireSnd",
  ExplosionSmall = "explosionSmallSnd",
  ExplosionMedium = "explosionMedium",
  DarkMagic = "darkMagic",
  Schwing = "schwingSnd",
  Paper = "paperSnd",
  Arrow = "arrowSnd",
  Bow = "bowSnd",
  Glass = "glassSnd",
  Crack = "crackSnd",
  Beam = "beamSnd",
  Wing = "wingSnd",
  FireWork = "fireworkSnd",
  Sparkle = "sparkleSnd",
  Slice = "sliceSnd",
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

addSoundData(Sound.Jump, "494789__brandondelehoy__jacketcloth-rustle-3");
addSoundData(Sound.Jump, "494797__brandondelehoy__jacketcloth-rustle-9");
addSoundData(Sound.Land, "540272__zepurple__land-a-jump");
addSoundData(Sound.Land, "646660__sounddesignforyou__landing-on-the-ground-2");
addSoundData(Sound.Step, "514254__jtn191__footstep4");
addSoundData(Sound.Step, "514255__jtn191__footstep3");
addSoundData(Sound.Step, "514260__jtn191__footstep6");
addSoundData(Sound.Step, "514261__jtn191__footstep5");
addSoundData(Sound.Swing, "608054__department64__golfswing");
addSoundData(Sound.Pop, "468875__jordyporgeyyt__glass-wish-bottle-pop");
addSoundData(Sound.Pop, "563165__jarl_fenrir__bottle-pop");
addSoundData(Sound.Potion, "41529__jamius__potiondrinklong");
addSoundData(Sound.Splat, "198794__alienxxx__blood_splat_002a");
addSoundData(Sound.Splat, "198829__alienxxx__blood_splat_017a");
addSoundData(Sound.BigSplat, "237924__foolboymedia__splat-and-crunch");
addSoundData(Sound.Stone, "530354__danielpodlovics__stone");
addSoundData(Sound.Choir, "685297__goldthis__stacc-choir-in-c", 0.5);
addSoundData(
  Sound.Bomb,
  "393374__eflexmusic__big-sci-fi-explosionbomb-close-mixed"
);
addSoundData(Sound.Explosion, "490266__anomaex__sci-fi_explosion_2");
addSoundData(Sound.Fire, "472688__silverillusionist__fire-burst");
addSoundData(
  Sound.ExplosionSmall,
  "541478__eminyildirim__magic-fire-spell-impact-punch"
);
addSoundData(Sound.ExplosionSmall, "539972__za-games__fire-burst-flash");
addSoundData(Sound.ExplosionSmall, "249613__otisjames__explosionsfx");
addSoundData(Sound.ExplosionMedium, "175430__qubodup__excalibur-howitzer-shot");
addSoundData(Sound.DarkMagic, "442825__qubodup__dark-magic-loop", 0.7);
addSoundData(Sound.Schwing, "513739__daleonfire__sword-schwing");
addSoundData(Sound.Paper, "689301__cakon__se-turn-the-page1");
addSoundData(Sound.Arrow, "119060__jphilipp__arrow-shot", 0.7);
addSoundData(Sound.Bow, "536085__eminyildirim__leather-bow-stretch1");
addSoundData(Sound.Bow, "536085__eminyildirim__leather-bow-stretch2");
addSoundData(Sound.Bow, "536085__eminyildirim__leather-bow-stretch3");
addSoundData(Sound.Glass, "260433__roganmcdougald__glass-break-small-jar-01");
addSoundData(Sound.Glass, "260432__roganmcdougald__glass-break-small-jar-02");
addSoundData(Sound.Crack, "536921__eminyildirim__ice-crack-low");
addSoundData(Sound.Beam, "351222__arctis__hardstyle-bass-kick-9-with-reverb");
addSoundData(Sound.Wing, "626317__klankbeeld__wing-beat-eurasian-wren-220124");
addSoundData(Sound.FireWork, "588199__el_boss__firework-whistlers1", 0.5);
addSoundData(Sound.FireWork, "588199__el_boss__firework-whistlers2", 0.5);
addSoundData(Sound.Sparkle, "141256__autistic-lucario__magic-sound-loop", 0.4);
addSoundData(Sound.Slice, "109423__black-snow__sword-slice-14");

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
