import { Team } from "../../data/team";

export interface Settings {
  name: string;
  team: Team;
  tutorialDone: boolean;
  sfxVolume: number;
  musicVolume: number;
  gameLength: number;
  turnLength: number;
  trustClient: boolean;
  teamSize: number;
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
  let team =
    settings?.team?.setSize(settings.teamSize) ||
    Team.random(settings?.teamSize);

  return {
    name: "Player",
    tutorialDone: false,
    sfxVolume: 1,
    musicVolume: 0.6,
    gameLength: 10,
    turnLength: 45,
    trustClient: true,
    teamSize: 4,
    ...settings,
    team,
  };
};
