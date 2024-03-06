import { Team } from "../../data/team";
import { assertNumber } from "../number";

export interface Settings {
  name: string;
  teams: Team[];
  defaultTeam: number;
  tutorialDone: boolean;
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
    return (value as Team[]).map((team) => team.serialize());
  }

  if (key === "defaultTeam") {
    return assertNumber(value, -1);
  }

  return value;
};

export const defaults = (): Settings => {
  return {
    name: "Player",
    teams: [Team.random()],
    defaultTeam: -1,
    tutorialDone: false,
  };
};
