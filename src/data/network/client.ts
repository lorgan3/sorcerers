import Peer, { DataConnection } from "peerjs";
import { Message, MessageType } from ".";
import { KeyboardController } from "../controller/keyboardController";
import { Player } from "./player";
import { NetworkController } from "../controller/networkController";
import { Level } from "../level";
import { Character } from "../character";
import { ExplosiveDamage } from "../damage/explosiveDamage";

export class Client {
  private peer: Peer;
  private connection?: DataConnection;
  private controller?: KeyboardController;

  private players: Player[] = [];
  private activePlayer: Player | null = null;
  private time = 0;

  constructor(key?: string) {
    this.peer = new Peer(key!);
  }

  tick(dt: number) {
    this.activePlayer?.activeCharacter?.controlContinuous(
      dt,
      this.activePlayer.controller
    );

    Level.instance.tick(dt);

    this.time += dt;
    const frames = this.time | 0;
    if (frames % 3) {
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
        for (let i = 0; i < message.players.length; i++) {
          const data = message.players[i];
          if (this.players[i]?.name === data.name) {
            continue;
          }

          const player = new Player(
            data.you ? this.controller! : new NetworkController()
          );
          player.name = data.name;

          data.characters.forEach(({ name, hp, x, y }) => {
            const character = new Character(x, y, name);
            character.hp = hp;
            player.addCharacter(character);
          });

          this.players.splice(i, 0, player);
        }

        this.players = this.players.slice(0, message.players.length);
        Level.instance.activePlayer = message.activePlayer;
        this.activePlayer = this.players[message.activePlayer];
        this.activePlayer.active = message.activeCharacter;
        break;

      case MessageType.ActiveCharacter:
        Level.instance.activePlayer = message.activePlayer;
        this.players[message.activePlayer].active = message.activeCharacter;
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
    }
  }
}
