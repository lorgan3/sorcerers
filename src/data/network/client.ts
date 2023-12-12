import Peer, { DataConnection } from "peerjs";
import { Message, MessageType } from "./types";
import { KeyboardController } from "../controller/keyboardController";
import { Player } from "./player";
import { Level } from "../map/level";
import { Character } from "../character";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Manager } from "./manager";
import { Team } from "../team";

export class Client extends Manager {
  private connection?: DataConnection;
  private controller?: KeyboardController;

  private static _clientInstance: Client;
  static get instance() {
    return Client._clientInstance;
  }

  constructor(peer: Peer) {
    super(peer);
    Client._clientInstance = this;
  }

  get isConnected() {
    return !!this.connection;
  }

  tick(dt: number, dtMs: number) {
    super.tick(dt, dtMs);

    if (this.frames % 3 === 0) {
      this.connection!.send({
        type: MessageType.InputState,
        data: this.controller!.serialize(),
      });
    }
  }

  join(key: string, name: string, team: Team) {
    this.connection = this.peer.connect(key);

    this.connection.on("open", () => {
      this.connection!.send({
        type: MessageType.Join,
        name,
        team: team.serialize(),
      });
    });

    this.connection.on("error", (err) => {
      console.log("error", err);
    });

    this.connection.on("close", () => {
      console.log("closed");
    });
  }

  onLobbyUpdate(fn: (message: Message) => void) {
    this.connection!.on("data", (data) => fn(data as Message));
  }

  connect(controller: KeyboardController) {
    this.controller = controller;

    this.connection!.off("data");
    this.connection!.on("data", (data) => {
      this.handleMessage(data as Message);
    });
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
            player.connect(
              data.name,
              Team.fromJson(data.team),
              this.controller!
            );
          }

          data.characters.forEach(({ name, hp, x, y }) => {
            const character = new Character(x, y, name);
            character.hp = hp;
            player.addCharacter(character);
          });

          this.players.splice(i, 0, player);
        }

        this.players = this.players.slice(0, message.players.length);
        break;

      case MessageType.ActiveCharacter:
        this.activePlayer = this.players[message.activePlayer];
        this.activePlayer.active = message.activeCharacter;
        this.activePlayer.activeCharacter.attacked = false;
        this.windSpeed = message.windSpeed;
        this.turnStartTime = message.turnStartTime;
        break;

      case MessageType.InputState:
        this.activePlayer!.controller.deserialize(message.data);
        this.activePlayer!.activeCharacter.control(
          this.activePlayer!.controller
        );
        break;

      case MessageType.ActiveUpdate:
        this.activePlayer!.characters[this.activePlayer!.active].deserialize(
          message.data
        );
        break;

      case MessageType.SyncDamage:
        const damageSource = ExplosiveDamage.deserialize(message.data);
        damageSource.damage();
        break;

      case MessageType.SyncMap:
        Level.instance.terrain.deserialize(message);
        break;

      case MessageType.Popup:
        this.addPopup(message);
        break;
    }
  }
}
