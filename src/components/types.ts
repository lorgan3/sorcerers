export interface IPlayer {
  color: string;
  name: string;
  team: { getLimitedCharacters: () => string[] };
}

export enum Rank {
  Gold = "gold",
  Silver = "silver",
  Bronze = "bronze",
  None = "none",
}
