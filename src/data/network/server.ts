import Peer from "peerjs";
import { MessageType, Message, Popup } from "./types";
import { Player } from "./player";
import { Character } from "../character";
import { KeyboardController } from "../controller/keyboardController";
import { Level } from "../map/level";
import { DamageSource } from "../damage";
import { Manager } from "./manager";
import { MESSAGES, PLACEHOLDER } from "../text/turnStart";
import { Team } from "../team";
import { COLORS } from "./constants";

export class Server extends Manager {
  private started = false;
  private controller?: KeyboardController;
  private availableColors = [...COLORS];

  private static _serverInstance: Server;
  static get instance() {
    return Server._serverInstance;
  }

  constructor(peer: Peer) {
    super(peer);
    Server._serverInstance = this;

    this._self = new Player();
    this.players.push(this._self);
  }

  connect(controller: KeyboardController) {
    this.controller = controller;

    this._self!.connect(
      this._self!.name,
      this._self!.team,
      this._self!.color,
      this.controller
    );
  }

  join(name: string, team: Team) {
    this._self!.connect(
      name,
      team,
      this.availableColors.pop()!,
      this.controller
    );
  }

  async start() {
    await Server.instance.broadcast({
      type: MessageType.StartGame,
      map: await Level.instance.terrain.serialize(),
    });

    for (let player of this.players) {
      for (let character of player.team.characters) {
        player.addCharacter(
          new Character(
            player,
            ...Level.instance.getRandomSpawnLocation(),
            character
          )
        );
      }
    }

    this.syncPlayers();
    this.cycleActivePlayer();

    this.started = true;
    this.time = 0;
  }

  tick(dt: number, dtMs: number) {
    super.tick(dt, dtMs);

    if (this.time - this.turnStartTime > this.turnLength) {
      this.cycleActivePlayer();
    }

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

      this.broadcast({
        type: MessageType.InputState,
        data: pressedKeys,
      });
    }
  }

  listen() {
    console.log("server start ", this.peer);

    this.peer.on("connection", (connection) => {
      const player = new Player(connection);

      connection.on("open", () => {
        console.log("open");
        this.players.push(player);
      });

      connection.on("error", (err) => {
        console.log("error", err);
      });

      connection.on("data", (data) => {
        this.handleMessage(data as Message, player);
      });

      connection.on("close", () => {
        console.log("closed");
        player.destroy();
        this.players.splice(this.players.indexOf(player));
        this.availableColors.push(player.color);

        // Temp
        if (this.activePlayer === player) {
          this.activePlayer = this.players[0];
        }

        this.syncPlayers();
      });
    });
  }

  syncDamage(damageSource: DamageSource) {
    this.broadcast({
      type: MessageType.SyncDamage,
      data: damageSource.serialize(),
    });
  }

  private handleMessage(message: Message, player: Player) {
    switch (message.type) {
      case MessageType.Join:
        const color = this.availableColors.pop();

        if (!color) {
          console.warn("Did not accept player because out of colors!");
          player.connection!.close();
          return;
        }

        const team = Team.fromJson(message.team);
        player.connect(
          message.name,
          team.isValid() ? team : Team.random(),
          color
        );

        // if (this.started) {
        //   // Do this before syncing the entities because they contain a reference to the mask!
        //   player.connection!.send({
        //     type: MessageType.SyncMap,
        //     ...Level.instance.terrain.serialize(),
        //   });

        //   const character = new Character(50, 0, getWord());
        //   player.addCharacter(character);
        // }

        this.syncPlayers();
        break;

      case MessageType.InputState:
        player.controller.deserialize(message.data);

        if (player === this.activePlayer) {
          this.broadcast(message);
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
          team: p.team.serialize(),
          color: p.color,
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
    this.activePlayer.activeCharacter.attacked = false;
    this.followTarget = this.activePlayer.activeCharacter;
    this.windSpeed = Math.round(Math.random() * 16 - 8);
    this.turnStartTime = this.time;

    this.broadcast({
      type: MessageType.ActiveCharacter,
      activePlayer: activePlayerIndex,
      activeCharacter: this.activePlayer.active,
      windSpeed: this.windSpeed,
      turnStartTime: this.turnStartTime,
    });

    this.addPopup({
      title: `${this.activePlayer.name}'s turn`,
      meta: MESSAGES[Math.floor(Math.random() * MESSAGES.length)].replace(
        PLACEHOLDER,
        this.activePlayer.activeCharacter.name
      ),
    });
  }

  protected addPopup(popup: Popup): void {
    super.addPopup(popup);

    this.broadcast({
      type: MessageType.Popup,
      ...popup,
    });
  }

  async broadcast(message: Message) {
    await Promise.all(
      this.players.map((player) => player.connection?.send(message))
    );
  }

  rename(newName: string) {
    this._self!.rename(newName);
  }
}
