import Peer from "peerjs";
import { MessageType, Message, Popup } from "./types";
import { Player } from "./player";
import { Character } from "../entity/character";
import { KeyboardController } from "../controller/keyboardController";
import { Level } from "../map/level";
import { Manager } from "./manager";
import { MESSAGES, PLACEHOLDER } from "../text/turnStart";
import { Team } from "../team";
import { COLORS } from "./constants";
import { SPELLS } from "../spells";
import { DamageSource } from "../damage/types";

export class Server extends Manager {
  private controller?: KeyboardController;
  private availableColors = [...COLORS];
  private singlePlayer = false;

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
    Server.instance.broadcast({
      type: MessageType.StartGame,
      map: await Level.instance.terrain.serialize(),
    });

    this._self?.resolveReady();
    await Promise.all(this.players.map((player) => player.ready));

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

    this.time = 0;
    this.singlePlayer = this.players.length === 1;
  }

  tick(dt: number, dtMs: number) {
    super.tick(dt, dtMs);

    if (this.time - this.turnStartTime > this.turnLength) {
      this.cycleActivePlayer();

      if (this.time > this.gameLength) {
        Level.instance.sink();
      }
    }

    if (this.frames % 30 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        players: this.players.map((player) => player.serialize()),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    } else if (this.frames % 10 === 0 && this.activePlayer!.activeCharacter) {
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
      kind: damageSource.type,
      data: damageSource.serialize(),
    });
  }

  endGame() {
    if (this.activePlayer!.characters.length) {
      this.addPopup({
        title: `${this.activePlayer!.name} wins!`,
        duration: 60000,
      });
    } else {
      this.addPopup({
        title: `Everybody loses!`,
        duration: 60000,
      });
    }
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

      case MessageType.SelectSpell:
        const spell = SPELLS[message.spell] || null;

        if (player.selectedSpell !== spell) {
          this.selectSpell(spell, player);

          const newMessage: Message = {
            type: MessageType.SelectSpell,
            spell: message.spell,
            player: this.players.indexOf(player),
          };
          this.broadcast(newMessage);
        }
        break;

      case MessageType.ClientReady:
        player.resolveReady();
    }
  }

  private syncPlayers() {
    for (let player of this.players) {
      const response: Message = {
        type: MessageType.SyncPlayers,
        time: this.time,
        players: this.players.map((p) => ({
          name: p.name,
          team: p.team.serialize(),
          color: p.color,
          you: p === player,
          spell:
            p.selectedSpell === null ? null : SPELLS.indexOf(p.selectedSpell),
          characters: p.characters.map((character) => {
            const [x, y] = character.body.precisePosition;
            return {
              id: character.id,
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

  private getNextPlayerIndex() {
    const activePlayerIndex = this.activePlayer
      ? this.players.indexOf(this.activePlayer)
      : -1;

    for (let i = 0; i < this.players.length; i++) {
      const index = (activePlayerIndex + i + 1) % this.players.length;

      if (index === activePlayerIndex && !this.singlePlayer) {
        continue;
      }

      if (this.players[index].characters.length) {
        return index;
      }
    }

    return null;
  }

  private cycleActivePlayer() {
    const activePlayerIndex = this.getNextPlayerIndex();

    if (activePlayerIndex === null) {
      this.endGame();
      return;
    }

    const player = this.players[activePlayerIndex];
    this.setActiveCharacter(
      activePlayerIndex,
      (player.active + 1) % player.characters.length
    );

    this.windSpeed = Math.round(Math.random() * 16 - 8);
    this.turnStartTime = this.time;
    this.turnEnding = false;

    this.broadcast({
      type: MessageType.ActiveCharacter,
      activePlayer: activePlayerIndex,
      activeCharacter: this.activePlayer!.active,
      windSpeed: this.windSpeed,
      turnStartTime: this.turnStartTime,
    });

    this.addPopup({
      title: `${this.activePlayer!.name}'s turn`,
      meta: MESSAGES[Math.floor(Math.random() * MESSAGES.length)].replace(
        PLACEHOLDER,
        this.activePlayer!.activeCharacter.name
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
    for (let player of this.players) {
      player.connection?.send(message);
    }
  }

  rename(newName: string) {
    this._self!.rename(newName);
  }
}
