import { Team } from "../../data/team";
import { assertNumber } from "../number";

export interface GameSettings {
  trustClient: boolean;
  turnLength: number;
  gameLength: number;
  teamSize: number;
  manaMultiplier: number;
  itemSpawnChance: number;
}

export interface Settings {
  name: string;
  team: Team;
  tutorialDone: boolean;
  sfxVolume: number;
  musicVolume: number;
  gameSettings: GameSettings;
}

export const settingsReviver = (key: string, value: any): any => {
  if (key === "team") {
    return Team.fromJson(value, value.length);
  }

  if (key === "sfxVolume" || key === "musicVolume") {
    return assertNumber(value, 0, 1);
  }

  if (key === "gameLength") {
    return assertNumber(value, 0);
  }

  if (key === "turnLength") {
    return assertNumber(value, 5);
  }

  if (key === "teamSize") {
    return assertNumber(value, 1, 10);
  }

  if (key === "manaMultiplier") {
    return assertNumber(value, 0, 2500);
  }

  if (key === "itemSpawnChance") {
    return assertNumber(value, 0, 500);
  }

  return value;
};

export const settingsReplacer = (key: string, value: any): any => {
  if (key === "team") {
    return (value as Team).serialize();
  }

  return value;
};

export const defaults = (settings?: Partial<Settings> | null): Settings => {
  const { gameSettings, ...rest } = settings || {};

  let team =
    settings?.team?.setSize(gameSettings?.teamSize) ||
    Team.random(gameSettings?.teamSize);

  return {
    name: "Player",
    tutorialDone: false,
    sfxVolume: 1,
    musicVolume: 0.5,
    gameSettings: {
      turnLength: 45, // Seconds
      gameLength: 10, // Minutes
      trustClient: true,
      teamSize: 4,
      manaMultiplier: 100,
      itemSpawnChance: 100,
      ...gameSettings,
    },
    ...rest,
    team,
  };
};
