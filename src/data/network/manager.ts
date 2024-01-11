import Peer from "peerjs";
import { Player } from "./player";
import { Popup } from "./types";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import { DisplayObject } from "pixi.js";
import { Spell } from "../spells";
import { Cursor } from "../../grapics/cursor/types";

const TURN_GRACE_PERIOD = 3000;

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
  protected turnEnding = false;

  private cursor: Cursor | null = null;
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

    if (this.cursor) {
      this.cursor.tick(dt, this.activePlayer!.controller);
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
    if (this.activePlayer?.activeCharacter) {
      this.activePlayer.activeCharacter.removeWings();
    }

    this.turnEnding = true;
    this.turnStartTime = Math.min(
      this.time - this.turnLength + TURN_GRACE_PERIOD,
      this.turnStartTime
    );

    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }
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

  selectSpell(spell: Spell, player: Player = this._self!) {
    player.selectedSpell = spell;

    if (player === this.activePlayer) {
      if (this.cursor) {
        this.cursor.remove();
        this.cursor = null;
      }

      if (!this.turnEnding) {
        this.cursor = new spell.cursor(player.activeCharacter, spell);
      }
    }
  }

  get selectedSpell() {
    return this._self?.selectedSpell || null;
  }

  setActiveCharacter(player: number, character: number) {
    this.activePlayer = this.players[player];
    this.activePlayer.active = character;

    this.followTarget = this.activePlayer.activeCharacter;

    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }

    if (this.activePlayer.selectedSpell) {
      this.cursor = new this.activePlayer.selectedSpell.cursor(
        this.activePlayer.activeCharacter,
        this.activePlayer.selectedSpell
      );
    }
  }
}
