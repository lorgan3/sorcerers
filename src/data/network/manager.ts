import Peer from "peerjs";
import { Player } from "./player";
import { Popup } from "./types";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import { DisplayObject } from "pixi.js";

export abstract class Manager {
  private static _instance: Manager;
  static get instance() {
    return Manager._instance;
  }

  protected _self: Player | null = null;
  protected followTarget: DisplayObject | null = null;
  public players: Player[] = [];
  protected activePlayer: Player | null = null;
  protected time = 0;
  protected frames = 0;
  protected windSpeed = 7;

  protected turnStartTime = 0;
  protected turnLength = 45 * 1000;
  protected gameLength = 10 * 60 * 1000;

  private popups: Popup[] = [];

  constructor(public readonly peer: Peer) {
    Manager._instance = this;
  }

  abstract connect(controller: KeyboardController): void;

  tick(dt: number, dtMs: number) {
    if (
      this._self === this.activePlayer &&
      this._self?.activeCharacter &&
      this._self.controller.isKeyDown()
    ) {
      Level.instance.follow(this._self.activeCharacter);
      this.followTarget = null;
    } else if (this.followTarget) {
      Level.instance.follow(this.followTarget);
    }

    this.activePlayer?.activeCharacter?.controlContinuous(
      dt,
      this.activePlayer.controller
    );

    Level.instance.tick(dt);

    this.time += dtMs;
    this.frames++;
  }

  endTurn() {
    this.turnStartTime = Math.min(
      this.time - this.turnLength + 5000,
      this.turnStartTime
    );
  }

  get self() {
    return this._self!;
  }

  getHudData() {
    return {
      turnTime: Math.max(0, this.turnLength - (this.time - this.turnStartTime)),
      gameTime: Math.max(0, this.gameLength - this.time),
      windSpeed: this.windSpeed,
      players: this.players,
      activePlayer: this.activePlayer,
    };
  }

  protected addPopup(popup: Popup) {
    this.popups.push(popup);
  }

  popupPop() {
    return this.popups.pop();
  }

  clearFollowTarget() {
    this.followTarget = null;
  }
}
