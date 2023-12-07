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
  protected turnLength = 45 * 1000;
  protected gameLength = 10 * 60 * 1000;

  constructor(public readonly peer: Peer) {
    Manager._instance = this;
  }

  abstract tick(dt: number, dtMs: number): void;

  endTurn() {
    this.turnStartTime = Math.min(
      this.time - this.turnLength + 5000,
      this.turnStartTime
    );
  }

  getHudData() {
    console.log(
      Math.max(0, this.turnLength - (this.time - this.turnStartTime)),
      this.turnStartTime
    );
    return {
      turnTime: Math.max(0, this.turnLength - (this.time - this.turnStartTime)),
      gameTime: Math.max(0, this.gameLength - this.time),
      windSpeed: this.windSpeed,
      players: this.players,
      activePlayer: this.activePlayer,
    };
  }
}
