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
import {
  HurtableEntity,
  Item,
  Priority,
  Syncable,
  isItem,
} from "../entity/types";
import { Element } from "../spells/types";

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

  tick(dt: number, dtMs: number) {
    super.tick(dt, dtMs);

    if (this.frames % 3 === 0 && this.connection) {
      this.connection!.send({
        type: MessageType.InputState,
        data: this.controller!.serialize(),
      });
    }
  }

  async join(key: string, name: string, team: Team) {
    this.connection = this.peer.connect(key);

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

      this.connection!.on("error", (err) => {
        console.log("error", err);
        close();
      });

      this.connection!.on("close", () => {
        console.log("closed");
        close();
      });
    });
  }

  onLobbyUpdate(fn: (message: Message) => void) {
    this.connection!.on("data", (data) => fn(data as Message));
  }

  connect(controller: KeyboardController) {
    if (this.controller) {
      throw new Error("Connecting an already connected client!");
    }

    super.connect(controller);

    this.connection!.off("data");
    this.connection!.on("data", (data) => {
      this.handleMessage(data as Message);
    });

    this.broadcast({
      type: MessageType.ClientReady,
    });
  }

  destroy() {
    console.log("Destroying client");
    Client._clientInstance = undefined;
    this.connection?.off("data");
    this.connection?.close();
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
            Team.fromJson(data.team),
            data.color,
            data.you ? this.controller : undefined
          );
          player.selectedSpell = data.spell ? SPELLS[data.spell] : null;

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
        Object.keys(this.elements).forEach(
          (key, i) => (this.elements[key as Element] = message.elements[i])
        );
        this.turnStartTime = message.turnStartTime;
        this._turnState = TurnState.Ongoing;

        Level.instance.cameraTarget.setTarget(
          this.setActiveCharacter(message.activePlayer, message.activeCharacter)
        );
        break;

      case MessageType.InputState:
        this.activePlayer?.controller.deserialize(message.data);
        this.activePlayer?.activeCharacter.control(
          this.activePlayer.controller
        );
        break;

      case MessageType.ActiveUpdate:
        this.activePlayer?.characters[this.activePlayer.active].deserialize(
          message.data
        );

        for (let i = 0; i < message.entities.length; i++) {
          Level.instance.syncables[Priority.High][i].deserialize(
            message.entities[i]
          );
        }
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
          Level.instance.syncables[Priority.Low][i].deserialize(
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
          const trigger = Level.instance.entityMap.get(
            message.tId
          ) as Character;

          item.activate(trigger);
        }
        break;

      case MessageType.turnState:
        this.setTurnState(message.state);
        break;
    }
  }

  broadcast(message: Message) {
    this.connection!.send(message);
  }
}
