import Peer, { DataConnection } from "peerjs";
import { Message, MessageType, TurnState } from "./types";
import { KeyboardController } from "../controller/keyboardController";
import { Player } from "./player";
import { Character } from "../entity/character";
import { Manager } from "./manager";
import { Team } from "../team";
import { SPELLS } from "../spells";
import { DAMAGE_SOURCES } from "../damage";
import { ENTITIES, setId } from "../entity";
import { Level } from "../map/level";
import { HurtableEntity, Item, Syncable, isItem } from "../entity/types";
import { Element } from "../spells/types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { filters } from "@pixi/sound";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { GameSettings } from "../../util/localStorage/settings";
import { AccumulatedStat } from "./accumulatedStat";

export class Client extends Manager {
  private connection?: DataConnection;

  private static _clientInstance?: Client;
  static get instance() {
    return Client._clientInstance!;
  }

  constructor(peer: Peer) {
    if (Client._clientInstance !== undefined) {
      throw new Error("Client already exists!");
    }

    super(peer);
    Client._clientInstance = this;
  }

  get isConnected() {
    return !!this.connection;
  }

  dealFallDamage(x: number, y: number, character: Character) {
    if (
      !this.settings.trustClient ||
      character.player !== this._self ||
      this.getActiveCharacter() !== character
    ) {
      return;
    }

    const velocity = character.body.velocity;
    const damage = new ExplosiveDamage(
      x + 3,
      y + 8 + character.body.yVelocity,
      velocity > 5 ? 12 : 8,
      Math.min(3, velocity * 0.4),
      Math.max(1, velocity - 3) ** 2
    );

    // Required to build the target list
    damage.getTargets();

    this.broadcast({
      type: MessageType.SyncDamage,
      kind: damage.type,
      data: damage.serialize(),
    });
  }

  fixedTick(dtMs: number) {
    super.fixedTick(dtMs);

    if (
      this.connection &&
      this.activePlayer === this._self &&
      this.activePlayer?.activeCharacter
    ) {
      if (this.settings.trustClient) {
        const inputState = this.controller!.serialize();

        if (this.isControlling()) {
          this.activePlayer.activeCharacter.control(this.controller!);
        }

        this.broadcast({
          type: MessageType.ActiveUpdate,
          data: this.activePlayer.activeCharacter.serialize(),
          inputState,
          cursor: null,
        } satisfies Message);
      } else {
        this.connection.send({
          type: MessageType.InputState,
          data: this.controller!.serialize(),
        });
      }
    }
  }

  async join(key: string, name: string, team: Team) {
    this.connection = this.peer!.connect(key, { reliable: true });

    return new Promise<void>((resolve, reject) => {
      const close = () => {
        this.connection!.close();
        this.connection = undefined;

        reject();
      };

      const timer = window.setTimeout(close, 5000);

      this.connection!.on("open", () => {
        window.clearInterval(timer);

        this.connection!.send({
          type: MessageType.Join,
          name,
          team: team.serialize(),
        });

        resolve();
      });

      this.connection!.on("error", (error) => {
        console.error(error);
        close();
      });

      this.connection!.on("close", () => {
        console.log("closed");
        close();
      });
    });
  }

  onLobbyUpdate(fn: (message: Message) => void, onClose: () => void) {
    this.connection!.on("data", (data) => fn(data as Message));
    this.connection!.on("close", onClose);
  }

  connect(
    controller: KeyboardController,
    settings: GameSettings,
    onBack: () => void
  ) {
    if (this.controller) {
      throw new Error("Connecting an already connected client!");
    }

    super.connect(controller, settings, onBack);

    this.connection!.off("data");
    this.connection!.on("data", (data) => {
      try {
        this.handleMessage(data as Message);
      } catch (error) {
        console.error(`[Server error]`, error);
        this.connection!.close();
      }
    });

    this.connection!.off("close");
    this.connection!.on("close", () => {
      console.log("closed");
      this.destroy();
    });

    this.broadcast({
      type: MessageType.ClientReady,
    });
  }

  destroy() {
    console.log("Destroying client");
    super.destroy();
    Client._clientInstance = undefined;
    this.connection?.off("data");
    this.connection?.close();
    this.peer!.destroy();
  }

  private handleMessage(message: Message) {
    switch (message.type) {
      case MessageType.SyncPlayers:
        this.time = message.time;

        for (let i = 0; i < message.players.length; i++) {
          const data = message.players[i];
          if (this.players[i]?.name === data.name) {
            continue;
          }

          const player = new Player();
          if (data.you) {
            this._self = player;
          }
          player.connect(
            data.name,
            Team.fromJson(data.team, this.settings.teamSize),
            data.color,
            data.you ? this.controller : undefined
          );
          player.selectedSpell =
            data.spell !== null ? SPELLS[data.spell] : null;

          data.characters.forEach(({ id, name, hp, x, y }) => {
            setId(id);

            const character = new Character(player, x, y, name);
            character.hp = hp;
            player.addCharacter(character);
          });

          this.players.splice(i, 0, player);
        }

        this.players = this.players.slice(0, message.players.length);
        break;

      case MessageType.ActiveCharacter:
        const lastActivePlayer = this.activePlayer;
        Object.keys(this.elements).forEach(
          (key, i) => (this.elements[key as Element] = message.elements[i])
        );
        this.turnStartTime = message.turnStartTime;
        this.time = message.time;
        this._turnState = TurnState.Ongoing;

        const character = this.setActiveCharacter(
          message.activePlayer,
          message.activeCharacter
        );
        character.player.mana = message.newMana;

        if (character.player !== lastActivePlayer) {
          character.player.nextTurn();
        }

        if (this.activePlayer?.selectedSpell) {
          this.selectSpell(this.activePlayer?.selectedSpell, this.activePlayer);
        }

        Level.instance.cameraTarget.setTarget(character);
        break;

      case MessageType.ActiveUpdate:
        if (!this.settings.trustClient || this.activePlayer !== this._self) {
          if (this.activePlayer) {
            this.activePlayer.controller.deserialize(message.inputState);
            this.activePlayer.characters[this.activePlayer.active].control(
              this.activePlayer.controller
            );

            this.activePlayer.characters[this.activePlayer.active].deserialize(
              message.data
            );
          }
        }

        this.cursor?.deserialize(message.cursor);
        break;

      case MessageType.SyncDamage:
        const damageSource = DAMAGE_SOURCES[message.kind].deserialize(
          message.data
        );
        damageSource.damage();

        if (
          damageSource
            .getTargets()
            .getEntities()
            .includes(this.getActiveCharacter()!)
        ) {
          this.setTurnState(TurnState.Ending);
        }
        break;

      case MessageType.Popup:
        this.addPopup(message);
        break;

      case MessageType.SelectSpell:
        this.selectSpell(
          SPELLS[message.spell] || null,
          this.players[message.player!]
        );
        break;

      case MessageType.Die:
        {
          const entity = Level.instance.entityMap.get(
            message.id
          ) as HurtableEntity;

          if (entity === this.getActiveCharacter()) {
            this.clearActiveCharacter();
          }

          entity.die();
        }
        break;

      case MessageType.EntityUpdate:
        for (let i = 0; i < message.entities.length; i++) {
          const entity = Level.instance.syncables[message.priority][i];
          if (
            this.settings.trustClient &&
            this.activePlayer === this._self &&
            this.activePlayer?.activeCharacter === entity
          ) {
            continue;
          }

          Level.instance.syncables[message.priority][i].deserialize(
            message.entities[i]
          );
        }
        break;

      case MessageType.Spawn:
        {
          if (!ENTITIES[message.kind]) {
            throw new Error(
              `Can't instantiate entity of type ${message.kind} and id ${message.id}`
            );
          }

          setId(message.id);
          const entity = ENTITIES[message.kind]!.create(message.data);
          Level.instance.add(entity);
        }
        break;

      case MessageType.DynamicUpdate:
        {
          const entity = Level.instance.entityMap.get(message.id) as Syncable;
          entity.deserialize(message.data);
        }
        break;

      case MessageType.Focus:
        {
          const entity = Level.instance.entityMap.get(
            message.id
          ) as HurtableEntity;

          Level.instance.cameraTarget.setTarget(entity);
        }
        break;

      case MessageType.Highlight:
        {
          const entity = Level.instance.entityMap.get(
            message.id
          ) as HurtableEntity;

          Level.instance.cameraTarget.highlight(
            entity,
            isItem(entity) ? () => entity.appear() : undefined
          );
        }
        break;

      case MessageType.Activate:
        {
          const item = Level.instance.entityMap.get(message.id) as Item;
          const trigger = message.tId
            ? (Level.instance.entityMap.get(message.tId) as Character)
            : undefined;

          item.activate(trigger);
        }
        break;

      case MessageType.turnState:
        this.setTurnState(message.state);
        break;

      case MessageType.Sink:
        if (Level.instance.terrain.killbox.level > message.level) {
          Level.instance.shake();
          new ControllableSound(Sound.Drain, new filters.StereoFilter(0), {});
        }

        Level.instance.terrain.killbox.level = message.level;
        break;

      case MessageType.Cast:
        this.cast(message.state);
        break;

      case MessageType.EndGame:
        {
          const playerMap = Object.fromEntries(
            this.players.map((player) => [player.color, player])
          );
          this.stats = message.stats.map((stat) =>
            AccumulatedStat.deserialize(stat, playerMap)
          );
        }
        break;

      default:
        console.error("invalid message", message);
    }
  }

  broadcast(message: Message) {
    this.connection!.send(message);
  }
}
