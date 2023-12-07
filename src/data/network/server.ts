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
import { Manager } from "./manager";

export class Server extends Manager {
  private frames = 0;

  constructor(key: string) {
    super(new Peer(key));
  }

  join(controller: Controller) {
    const player = new Player(controller);
    player.name = "Host";
    this.players.push(player);

    player.addCharacter(new Character(0, 0, getWord()));
    this.cycleActivePlayer();
  }

  tick(dt: number, dtMs: number) {
    this.activePlayer?.activeCharacter.controlContinuous(
      dt,
      this.activePlayer.controller
    );

    Level.instance.tick(dt);

    this.time += dtMs;

    if (this.time - this.turnStartTime > this.turnLength) {
      this.cycleActivePlayer();
    }

    this.frames++;

    if (this.frames % 30 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        players: this.players.map((player) => player.serialize()),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    } else if (this.frames % 10 === 0) {
      const data: Message = {
        type: MessageType.ActiveUpdate,
        data: this.activePlayer!.activeCharacter.serialize(),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    }

    if (
      this.frames % 3 === 0 &&
      this.players.indexOf(this.activePlayer!) === 0
    ) {
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

        // Do this before syncing the entities because they contain a reference to the mask!
        player.connection!.send({
          type: MessageType.SyncMap,
          ...Level.instance.terrain.serialize(),
        });

        this.syncPlayers();
        this.cycleActivePlayer();
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
        time: this.time,
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

  private cycleActivePlayer() {
    let activePlayerIndex = 0;
    if (this.activePlayer) {
      this.activePlayer.active =
        (this.activePlayer.active + 1) % this.activePlayer.characters.length;
      activePlayerIndex =
        (this.players.indexOf(this.activePlayer) + 1) % this.players.length;
    }

    this.activePlayer = this.players[activePlayerIndex];
    this.windSpeed = Math.round(Math.random() * 16 - 8);
    this.turnStartTime = this.time;

    const message = {
      type: MessageType.ActiveCharacter,
      activePlayer: activePlayerIndex,
      activeCharacter: this.activePlayer.active,
      windSpeed: this.windSpeed,
      turnStartTime: this.turnStartTime,
    };
    for (let player of this.players) {
      player.connection?.send(message);
    }
  }
}
