import Peer from "peerjs";
import { MessageType, Message } from ".";
import { NetworkController } from "../controller/networkController";
import { Controller } from "../controller/controller";
import { Player } from "./player";
import { Character } from "../character";
import { KeyboardController } from "../controller/keyboardController";
import { Level } from "../level";
import { getWord } from "../../util/word";
import { DamageSource } from "../damage";

export class Server {
  public readonly peer: Peer;

  private players: Player[] = [];
  private activePlayer: Player | null = null;
  private time = 0;

  constructor(key: string) {
    this.peer = new Peer(key);
  }

  join(controller: Controller) {
    const player = new Player(controller);
    player.name = "Host";
    this.players.push(player);

    player.addCharacter(new Character(0, 0, getWord()));
    this.activePlayer = player;
  }

  tick(dt: number) {
    this.activePlayer?.activeCharacter.controlContinuous(
      dt,
      this.activePlayer.controller
    );

    Level.instance.tick(dt);

    this.time += dt;
    const frames = this.time | 0;

    if (frames % 30 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        players: this.players.map((player) => player.serialize()),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    } else if (frames % 10 === 0) {
      const data: Message = {
        type: MessageType.ActiveUpdate,
        data: this.activePlayer!.activeCharacter.serialize(),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    }

    if (frames % 3 === 0 && this.players.indexOf(this.activePlayer!) === 0) {
      const pressedKeys = (
        this.activePlayer!.controller as KeyboardController
      ).serialize();

      for (let player of this.players) {
        player.connection?.send({
          type: MessageType.InputState,
          data: pressedKeys,
        });
      }
    }
  }

  listen() {
    console.log("server start ", this.peer);

    this.peer.on("connection", (connection) => {
      const controller = new NetworkController();
      const player = new Player(controller, connection);

      connection.on("open", () => {
        console.log("open");
        this.players.push(player);
      });

      connection.on("error", (err) => {
        console.log("error", err);
      });

      connection.on("data", (data) => {
        this.handleMessage(data as Message, player, controller);
      });

      connection.on("close", () => {
        console.log("closed");
        player.destroy();
        this.players.splice(this.players.indexOf(player));

        // Temp
        if (this.activePlayer === player) {
          this.activePlayer = this.players[0];
        }

        this.syncPlayers();
      });
    });
  }

  syncDamage(damageSource: DamageSource) {
    const message = {
      type: MessageType.SyncDamage,
      data: damageSource.serialize(),
    };

    for (let player of this.players) {
      player.connection?.send(message);
    }
  }

  private handleMessage(
    message: Message,
    player: Player,
    controller: NetworkController
  ) {
    switch (message.type) {
      case MessageType.Join:
        player.name = message.name;

        const character = new Character(50, 0, getWord());
        player.addCharacter(character);
        this.activePlayer = player;

        // Do this before syncing the entities because they contain a reference to the mask!
        player.connection!.send({
          type: MessageType.SyncMap,
          ...Level.instance.terrain.serialize(),
        });

        this.syncPlayers();
        break;

      case MessageType.InputState:
        controller.deserialize(message.data);

        if (player === this.activePlayer) {
          for (let player of this.players) {
            player.connection?.send(message);
          }
        }
        break;
    }
  }

  private syncPlayers() {
    const activePlayer = this.players.indexOf(this.activePlayer!);

    for (let player of this.players) {
      const response: Message = {
        type: MessageType.SyncPlayers,
        players: this.players.map((p) => ({
          name: p.name,
          you: p === player,
          characters: p.characters.map((character) => {
            const [x, y] = character.body.precisePosition;
            return {
              name: character.name,
              hp: character.hp,
              x,
              y,
            };
          }),
        })),
        activeCharacter: this.activePlayer!.active,
        activePlayer,
      };

      player.connection?.send(response);
    }
  }
}
