export interface IPlayer {
  color: string;
  name: string;
  team: { getLimitedCharacters: () => string[] };
}
