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
import { Key } from "../controller/controller";

const TURN_GRACE_PERIOD = 3000;
const CACHE_TIME = 30;

export abstract class Manager {
  private static _instance?: Manager;
  static get instance() {
    return Manager._instance!;
  }

  protected _self: Player | null = null;
  protected controller?: KeyboardController;
  protected onBack?: () => void;
  public players: Player[] = [];
  protected activePlayer: Player | null = null;
  protected activePlayerIndex = -1;
  protected time = 0;
  protected frames = 0;
  protected elements = Object.fromEntries(
    Object.values(Element).map((element, i) => [element, i / 2])
  ) as Record<Element, number>;
  private cachedElementValues: Partial<
    Record<Element, { value: number; time: number }>
  > = {};

  protected turnStartTime = 0;
  protected turnLength = 45 * 1000;
  protected gameLength = 10 * 60 * 1000;
  protected _turnState = TurnState.Ongoing;

  protected cursor: Cursor | null = null;
  private popups: Popup[] = [];

  constructor(public readonly peer?: Peer) {
    Manager._instance = this;
  }

  connect(controller: KeyboardController, onBack: () => void) {
    this.controller = controller;
    this.onBack = onBack;
    Level.instance.cameraTarget.connect(controller);
  }

  destroy() {
    Manager._instance = undefined;
  }

  tick(dt: number) {
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
  }

  fixedTick(dtMs: number) {
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
          y + 16 > layer.y &&
          y < layer.bottom
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

      if (Level.instance.hasDeathQueue()) {
        return;
      }
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

    this.resetCursor();
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
      this._turnState !== TurnState.Spawning &&
      (this._turnState !== TurnState.Attacked ||
        !this.activePlayer?.activeCharacter?.isCasting())
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
      this.resetCursor();

      if (
        this._turnState === TurnState.Ongoing &&
        player.mana >= getSpellCost(spell)
      ) {
        this.cursor = new spell.cursor(player.activeCharacter, spell);
        Level.instance.setBrowserCursorVisibility(false);
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

    this.resetCursor();

    if (this.activePlayer.controller.isKeyDown(Key.Inventory)) {
      this.activePlayer.activeCharacter.openSpellBook();
    }

    return this.activePlayer.activeCharacter;
  }

  getActiveCharacter() {
    return this.activePlayer?.activeCharacter;
  }

  clearActiveCharacter() {
    this.activePlayer = null;
  }

  getActivePlayer() {
    return this.activePlayer;
  }

  getElementValue(element: Element) {
    const cached = this.cachedElementValues[element];
    if (cached && cached.time + CACHE_TIME > this.time) {
      return cached.value;
    }

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
        const value = Math.min(1.75, this.elements[element] * 2);
        this.cachedElementValues[element] = { value, time: this.time };
        return value;
      }
    }

    const value = this.elements[element];
    this.cachedElementValues[element] = { value, time: this.time };
    return value;
  }

  cast(state: any = {}) {
    if (!this.activePlayer) {
      throw new Error("Casting without active player");
    }

    if (!this.cursor) {
      throw new Error("Casting without cursor");
    }

    const spell = this.activePlayer.selectedSpell!;
    this.cursor.trigger(spell.data, state);
    this.activePlayer.cast(spell);

    this.resetCursor();
  }

  resetCursor() {
    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
      Level.instance.setBrowserCursorVisibility(true);
    }
  }
}
