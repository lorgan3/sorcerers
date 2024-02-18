import Peer from "peerjs";
import { Player } from "./player";
import { Popup, TurnState } from "./types";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import { Spell, getSpellCost } from "../spells";
import { Cursor } from "../../graphics/cursor/types";
import { Element } from "../spells/types";
import { HurtableEntity } from "../entity/types";
import { MagicScroll } from "../entity/magicScroll";

const TURN_GRACE_PERIOD = 3000;

export abstract class Manager {
  private static _instance: Manager;
  static get instance() {
    return Manager._instance;
  }

  protected _self: Player | null = null;
  protected controller?: KeyboardController;
  public players: Player[] = [];
  protected activePlayer: Player | null = null;
  protected activePlayerIndex = -1;
  protected time = 0;
  protected frames = 0;
  protected elements = Object.fromEntries(
    Object.values(Element).map((element, i) => [element, i / 2])
  ) as Record<Element, number>;

  protected turnStartTime = 0;
  protected turnLength = 45 * 1000;
  protected gameLength = 10 * 60 * 1000;
  protected _turnState = TurnState.Ongoing;

  private cursor: Cursor | null = null;
  private popups: Popup[] = [];

  constructor(public readonly peer: Peer) {
    Manager._instance = this;
  }

  connect(controller: KeyboardController) {
    this.controller = controller;
    Level.instance.cameraTarget.connect(controller);
  }

  abstract destroy(): void;

  tick(dt: number, dtMs: number) {
    if (this.cursor) {
      this.cursor.tick(dt, this.activePlayer!.controller);
    }

    if (this.isControlling()) {
      this.activePlayer?.activeCharacter?.controlContinuous(
        dt,
        this.activePlayer.controller
      );
    }

    Level.instance.tick(dt);

    if (this.frames % 30 === 0) {
      this.checkOverlays();
    }

    this.time += dtMs;
    this.frames++;
  }

  checkOverlays() {
    const layers = Level.instance.terrain.layers;

    if (!this._self || !layers.length) {
      return;
    }

    for (let layer of layers) {
      let revealed = false;

      for (let character of this._self.characters) {
        const [x, y] = character.body.precisePosition;
        if (
          x + 6 >= layer.x &&
          x <= layer.right &&
          y + 16 >= layer.y &&
          y <= layer.bottom
        ) {
          revealed = true;
          break;
        }
      }

      Level.instance.terrain.setLayerVisibility(layer, revealed);
    }
  }

  setTurnState(turnState: TurnState) {
    if (turnState === TurnState.Ongoing) {
      return;
    }

    if (this._turnState === TurnState.Killing) {
      this.turnStartTime = Math.min(
        this.time - this.turnLength + TURN_GRACE_PERIOD,
        this.turnStartTime
      );
    }

    if (turnState === TurnState.Ending) {
      if (this.activePlayer?.activeCharacter) {
        this.activePlayer.activeCharacter.removeWings();
      }

      this.turnStartTime = Math.min(
        this.time - this.turnLength + TURN_GRACE_PERIOD,
        this.turnStartTime
      );
    }

    this._turnState = turnState;

    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }
  }

  get self() {
    return this._self!;
  }

  get turnState() {
    return this._turnState;
  }

  isEnding() {
    return (
      this._turnState !== TurnState.Ongoing &&
      this._turnState !== TurnState.Attacked
    );
  }

  isControlling() {
    return (
      this._turnState !== TurnState.Killing &&
      this._turnState !== TurnState.Spawning
    );
  }

  getHudData() {
    return {
      turnTime: Math.max(0, this.turnLength - (this.time - this.turnStartTime)),
      gameTime: Math.max(0, this.gameLength - this.time),
      players: this.players,
      activePlayer: this.activePlayer,
      mana: this._self?.mana || 0,
    };
  }

  protected addPopup(popup: Popup) {
    this.popups.push(popup);
  }

  popupPop() {
    return this.popups.pop();
  }

  selectSpell(spell: Spell, player: Player = this._self!) {
    player.selectedSpell = spell;

    if (player === this.activePlayer) {
      if (this.cursor) {
        this.cursor.remove();
        this.cursor = null;
      }

      if (
        this._turnState === TurnState.Ongoing &&
        player.mana >= getSpellCost(spell)
      ) {
        this.cursor = new spell.cursor(player.activeCharacter, spell);
      }
    }
  }

  get selectedSpell() {
    return this._self?.selectedSpell || null;
  }

  setActiveCharacter(player: number, character: number) {
    if (this.activePlayer?.activeCharacter) {
      this.activePlayer.activeCharacter.removeWings();
    }

    this.activePlayer = this.players[player];
    this.activePlayer.active = character;
    this.activePlayerIndex = player;
    this.activePlayer.nextTurn();

    Level.instance.cameraTarget.setTarget(this.activePlayer.activeCharacter);

    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }

    if (
      this.activePlayer.selectedSpell &&
      this.activePlayer.mana >= getSpellCost(this.activePlayer.selectedSpell)
    ) {
      this.cursor = new this.activePlayer.selectedSpell.cursor(
        this.activePlayer.activeCharacter,
        this.activePlayer.selectedSpell
      );
    }
  }

  getActiveCharacter() {
    return this.activePlayer?.activeCharacter;
  }

  clearActiveCharacter() {
    this.activePlayer = null;
  }

  getElementValue(element: Element) {
    if (!!this.activePlayer) {
      let buffed = false;
      Level.instance.withNearbyEntities(
        ...this.activePlayer.activeCharacter.getCenter(),
        MagicScroll.aoeRange / 2,
        (entity: HurtableEntity) => {
          if (
            entity instanceof MagicScroll &&
            entity.element === element &&
            entity.activated
          ) {
            buffed = true;
            return true;
          }
        }
      );

      if (buffed) {
        return Math.min(1.75, this.elements[element] * 2);
      }
    }

    return this.elements[element];
  }
}
