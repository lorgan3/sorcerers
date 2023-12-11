import { Team } from "../../data/team";

export interface Settings {
  teams: Team[];
}

// In an ideal world this returns `Settings[K]` but typescript doesn't understand
export const settingsReviver = <K extends keyof Settings>(
  key: K,
  value: any
): any => {
  if (key === "teams") {
    return value.map((json: any) => Team.fromJson(json));
  }

  return value;
};

export const settingsReplacer = <K extends keyof Settings>(
  key: K,
  value: Settings[K]
): any => {
  if (key === "teams") {
    return value.map((team) => team.serialize());
  }

  return value;
};

export const defaults = (): Settings => {
  return {
    teams: [Team.random()],
  };
};
