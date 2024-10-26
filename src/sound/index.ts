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
  Air = "airSnd",
  Launch = "launchSnd",
  Beep = "beepSnd",
  Ice = "iceSnd",
  Rumble = "rumbleSnd",
  Drain = "drainSnd",
  Burn = "burnSnd",
  Whip = "whipSnd",
  Electricity = "electricitySnd",
  Slime = "slimeSnd",
  Water = "waterSnd",
  Smoke = "smokeSnd",
  Tada = "tadaSnd",
}

export enum Music {
  TitleScreen = "titleScreenMusic",
  Battle = "battleMusic",
}

export interface SoundData {
  key: `${Sound | Music}_${string}`;
  src: string;
  volume: number;
}

const SOUND_DATA: Partial<Record<Sound | Music, SoundData[]>> = {};
let SFX_VOLUME = 1;
let MUSIC_VOLUME = 1;
let LAST_MUSIC: SoundData | undefined;

const addSoundData = (key: Sound, src: string, volume = 1) => {
  if (!(key in SOUND_DATA)) {
    SOUND_DATA[key] = [];
  }

  SOUND_DATA[key]!.push({
    key: `${key}_${SOUND_DATA[key]!.length}`,
    src: `${import.meta.env.BASE_URL}sfx/${src}.mp3`,
    volume,
  });
};

const addMusicData = (key: Music, src: string, volume = 1) => {
  if (!(key in SOUND_DATA)) {
    SOUND_DATA[key] = [];
  }

  SOUND_DATA[key]!.push({
    key: `${key}_${SOUND_DATA[key]!.length}`,
    src: `${import.meta.env.BASE_URL}music/${src}.mp3`,
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
addSoundData(Sound.FireWork, "588199__el_boss__firework-whistlers1", 0.4);
addSoundData(Sound.FireWork, "588199__el_boss__firework-whistlers2", 0.4);
addSoundData(Sound.Sparkle, "141256__autistic-lucario__magic-sound-loop", 0.4);
addSoundData(Sound.Slice, "109423__black-snow__sword-slice-14");
addSoundData(Sound.Air, "31473__dkristian__air_blast_001", 0.6);
addSoundData(Sound.Launch, "163458__lemudcrab__grenade-launcher");
addSoundData(
  Sound.Beep,
  "536422__rudmer_rotteveel__setting-electronic-timer-1-beep"
);
addSoundData(Sound.Ice, "452252__kyles__ice-cracks-medium7-brittle_1");
addSoundData(Sound.Ice, "452252__kyles__ice-cracks-medium7-brittle_2");
addSoundData(Sound.Ice, "452252__kyles__ice-cracks-medium7-brittle_3");
addSoundData(Sound.Rumble, "82722__prozaciswack__digging");
addSoundData(Sound.Drain, "17128__incarnadine__water_go_down_the_hole");
addSoundData(Sound.Burn, "581078__magnuswaker__flame-loop");
addSoundData(Sound.Whip, "529925__scifisounds__whip-crack");
addSoundData(Sound.Electricity, "680996__supersouper__electric-shock-1");
addSoundData(Sound.Water, "62105__rweale__weale_bubble1");
addSoundData(Sound.Slime, "433832__archos__slime-21_1", 0.6);
addSoundData(Sound.Slime, "433832__archos__slime-21_2", 0.6);
addSoundData(Sound.Slime, "433839__archos__slime-28", 0.6);
addSoundData(Sound.Smoke, "714257__qubodup__puff-of-smoke");
addSoundData(Sound.Tada, "397353__plasterbrain__tada-fanfare-g");

addMusicData(Music.TitleScreen, "Sorcerers Theme Sample", 0.8);
addMusicData(Music.Battle, "Sorcerers Battle 1", 0.8);
addMusicData(Music.Battle, "Sorcerers Level 2", 0.8);
addMusicData(Music.Battle, "Sorcerers Level 3", 0.7);
addMusicData(Music.Battle, "Sorcerers Level 4", 0.7);

export const SOUND_ASSETS = Object.fromEntries(
  Object.values(SOUND_DATA).reduce(
    (all, variants) =>
      all.concat(variants.map((variant) => [variant.key, variant.src])),
    [] as Array<[string, string]>
  )
);

export const getRandomSound = (sound: Sound) => {
  const result =
    SOUND_DATA[sound]![Math.floor(SOUND_DATA[sound]!.length * Math.random())];

  return {
    ...result,
    volume: result.volume * SFX_VOLUME,
  };
};

export const fade = (data: SoundData, duration = 0.5) => {
  return new Promise<void>((resolve) => {
    const s = sound.find(data.key);

    if (!s.isPlaying) {
      resolve();
      return;
    }

    const initialVolume = s.volume;
    const step = initialVolume / duration / 20;

    const timer = window.setInterval(() => {
      s.volume -= step;

      if (s.volume <= 0) {
        s.stop();
        s.volume = data.volume;
        window.clearInterval(timer);
        resolve();
      }
    }, 50);
  });
};

export const setVolume = (sfxVolume: number, musicVolume: number) => {
  sound.disableAutoPause = true;
  SFX_VOLUME = sfxVolume;
  MUSIC_VOLUME = musicVolume;

  if (LAST_MUSIC) {
    const s = sound.find(LAST_MUSIC.key);
    s.instances.forEach(
      (instance) => (instance.volume = LAST_MUSIC!.volume * musicVolume)
    );
  }
};

export const playMusic = async (music: Music) => {
  if (LAST_MUSIC) {
    if (LAST_MUSIC.key.startsWith(music)) {
      return;
    }

    await fade(LAST_MUSIC);
  }

  if (MUSIC_VOLUME === 0) {
    return;
  }

  const result =
    SOUND_DATA[music]![Math.floor(SOUND_DATA[music]!.length * Math.random())];
  LAST_MUSIC = result;

  await sound.play(result.key, {
    volume: result.volume * MUSIC_VOLUME,
    complete: () => {
      LAST_MUSIC = undefined;
      playMusic(music);
    },
  });
};

export const stopMusic = async () => {
  if (LAST_MUSIC) {
    await fade(LAST_MUSIC);
  }

  LAST_MUSIC = undefined;
};
