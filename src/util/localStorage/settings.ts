import { Team } from "../../data/team";

export interface Settings {
  name: string;
  team: Team;
  tutorialDone: boolean;
  sfxVolume: number;
  musicVolume: number;
}

// In an ideal world this returns `Settings[K]` but typescript doesn't understand
export const settingsReviver = <K extends keyof Settings>(
  key: K,
  value: any
): any => {
  if (key === "team") {
    return Team.fromJson(value);
  }

  return value;
};

export const settingsReplacer = <K extends keyof Settings>(
  key: K,
  value: Settings[K]
): any => {
  if (key === "team") {
    return (value as Team).serialize();
  }

  return value;
};

export const defaults = (settings?: Partial<Settings> | null): Settings => {
  return {
    name: "Player",
    team: Team.random(),
    tutorialDone: false,
    sfxVolume: 1,
    musicVolume: 0.6,
    ...settings,
  };
};
