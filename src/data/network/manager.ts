import Peer from "peerjs";
import { Player } from "./player";

export abstract class Manager {
  private static _instance: Manager;
  static get instance() {
    return Manager._instance;
  }

  protected players: Player[] = [];
  protected activePlayer: Player | null = null;
  protected time = 0;
  protected windSpeed = 7;

  protected turnStartTime = 0;
  protected turnLength = 10 * 1000;
  protected gameLength = 10 * 60 * 1000;

  constructor(public readonly peer: Peer) {
    Manager._instance = this;
  }

  abstract tick(dt: number, dtMs: number): void;

  getHudData() {
    return {
      turnTime: Math.max(0, this.turnLength - (this.time - this.turnStartTime)),
      gameTime: Math.max(0, this.gameLength - this.time),
      windSpeed: this.windSpeed,
      players: this.players,
      activePlayer: this.activePlayer,
    };
  }
}
