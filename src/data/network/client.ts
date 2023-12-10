import Peer, { DataConnection } from "peerjs";
import { Message, MessageType } from "./types";
import { KeyboardController } from "../controller/keyboardController";
import { Player } from "./player";
import { NetworkController } from "../controller/networkController";
import { Level } from "../level";
import { Character } from "../character";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Manager } from "./manager";

export class Client extends Manager {
  private connection?: DataConnection;
  private controller?: KeyboardController;

  constructor(key?: string) {
    super(new Peer(key!));
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

  connect(key: string, controller: KeyboardController) {
    this.controller = controller;
    this.connection = this.peer.connect(key);

    this.connection.on("open", () => {
      this.connection!.send({
        type: MessageType.Join,
        name: "Client",
      });
    });

    this.connection.on("error", (err) => {
      console.log("error", err);
    });

    this.connection.on("data", (data) => {
      this.handleMessage(data as Message);
    });

    this.connection.on("close", () => {
      console.log("closed");
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

          let player: Player;
          if (data.you) {
            player = new Player(this.controller!);
            this._self = player;
          } else {
            player = new Player(new NetworkController());
          }

          player.name = data.name;

          data.characters.forEach(({ name, hp, x, y }) => {
            const character = new Character(x, y, name);
            character.hp = hp;
            player.addCharacter(character);
          });

          this.players.splice(i, 0, player);
        }

        this.players = this.players.slice(0, message.players.length);
        this.activePlayer = this.players[message.activePlayer];
        this.activePlayer.active = message.activeCharacter;
        break;

      case MessageType.ActiveCharacter:
        this.activePlayer = this.players[message.activePlayer];
        this.players[message.activePlayer].active = message.activeCharacter;
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
