import Peer from "peerjs";
import { MessageType, Message, Popup, TurnState } from "./types";
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
import {
  HurtableEntity,
  Item,
  Spawnable,
  Syncable,
  isSpawnableEntity,
} from "../entity/types";
import { Element } from "../spells/types";
import { MagicScroll } from "../entity/magicScroll";
import { getRandom } from "../../util/object";

export class Server extends Manager {
  private availableColors = [...COLORS];
  private singlePlayer = false;
  private started = false;

  private disconnectedPlayers: Player[] = [];

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
    super.connect(controller);
    controller.isHost = true;

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
    this.started = true;
  }

  tick(dt: number, dtMs: number) {
    super.tick(dt, dtMs);

    if (this._turnState === TurnState.Ending) {
      Level.instance.performDeathQueue();
    }

    if (
      this.time - this.turnStartTime > this.turnLength &&
      this._turnState !== TurnState.Attacked &&
      this._turnState !== TurnState.Killing &&
      this._turnState !== TurnState.Spawning
    ) {
      this.preCycleActivePlayer();

      if (this.time > this.gameLength) {
        Level.instance.sink();
      }
    }

    if (this.frames % 30 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        entities: Level.instance.syncables.map((entity) => entity.serialize()),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    } else if (this.frames % 10 === 0 && this.activePlayer?.activeCharacter) {
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
      let player = this.disconnectedPlayers.pop()!;
      if (!player) {
        player = new Player();
        this.players.push(player);
      }

      connection.on("open", async () => {
        console.log("open");
        player.reconnect(connection);

        if (this.started) {
          connection.send({
            type: MessageType.StartGame,
            map: await Level.instance.terrain.serialize(),
          });

          await player.ready;
          this.syncSinglePlayer(player);

          connection.send({
            type: MessageType.ActiveCharacter,
            activePlayer: this.players.indexOf(this.activePlayer!),
            activeCharacter: this.activePlayer!.active,
            elements: Object.values(this.elements),
            turnStartTime: this.turnStartTime,
          });

          const spawnables = [...Level.instance.entities].filter(
            isSpawnableEntity
          );
          for (let spawnable of spawnables) {
            connection.send({
              type: MessageType.Spawn,
              id: spawnable.id,
              kind: spawnable.type,
              data: spawnable.serializeCreate(),
            });
          }
        }
      });

      connection.on("error", (err) => {
        console.log("error", err);
      });

      connection.on("data", (data) => {
        this.handleMessage(data as Message, player);
      });

      connection.on("close", () => {
        console.log("closed");

        if (!this.started) {
          this.players.splice(this.players.indexOf(player));
          player.destroy();
          this.availableColors.push(player.color);

          this.syncPlayers();
        } else {
          this.disconnectedPlayers.push(player);
          player.disconnect();
        }
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
    if (this.activePlayer?.characters.length) {
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
        if (this.started) {
          return;
        }

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

  private syncSinglePlayer(player: Player) {
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

  private syncPlayers() {
    for (let player of this.players) {
      this.syncSinglePlayer(player);
    }
  }

  private getNextPlayerIndex() {
    for (let i = 0; i < this.players.length; i++) {
      const index = (this.activePlayerIndex + i + 1) % this.players.length;

      if (index === this.activePlayerIndex && !this.singlePlayer) {
        continue;
      }

      if (this.players[index].characters.length) {
        return index;
      }
    }

    return null;
  }

  private randomizeElements() {
    const amounts = {} as Record<Element, number>;
    let total = 0;
    for (let element in this.elements) {
      const amount = 0.5 + Math.random();
      amounts[element as Element] = amount;
      total += amount;
    }

    for (let element in this.elements) {
      this.elements[element as Element] =
        (amounts[element as Element] / total) * 4;
    }
  }

  private preCycleActivePlayer() {
    this.setTurnState(TurnState.Spawning);

    const item = this.create(
      new MagicScroll(
        ...Level.instance.getRandomSpawnLocation(),
        getRandom(Element)
      )
    );

    this.highlight(item, () => {
      item.appear();

      this.cycleActivePlayer();
    });
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

    this.turnStartTime = this.time;
    this._turnState = TurnState.Ongoing;
    this.randomizeElements();

    this.broadcast({
      type: MessageType.ActiveCharacter,
      activePlayer: activePlayerIndex,
      activeCharacter: this.activePlayer!.active,
      elements: Object.values(this.elements),
      turnStartTime: this.turnStartTime,
      newMana: player.mana,
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

  broadcast(message: Message) {
    for (let player of this.players) {
      player.connection?.send(message);
    }
  }

  create<T extends Spawnable>(entity: T) {
    Level.instance.add(entity);

    this.broadcast({
      type: MessageType.Spawn,
      id: entity.id,
      kind: entity.type,
      data: entity.serializeCreate(),
    });

    return entity;
  }

  dynamicUpdate(entity: Syncable) {
    this.broadcast({
      type: MessageType.DynamicUpdate,
      id: entity.id,
      kind: entity.type,
      data: entity.serialize(),
    });
  }

  kill(entity: HurtableEntity | Syncable) {
    if (entity.die) {
      this.broadcast({
        type: MessageType.Die,
        id: entity.id,
      });

      entity.die();
    }
  }

  rename(newName: string) {
    this._self!.rename(newName);
  }

  focus(target: HurtableEntity) {
    Level.instance.cameraTarget.setTarget(target);

    this.broadcast({
      type: MessageType.Focus,
      id: target.id,
    });
  }

  highlight(target: HurtableEntity, callback?: () => void) {
    Level.instance.cameraTarget.highlight(target, callback);

    this.broadcast({
      type: MessageType.Highlight,
      id: target.id,
    });
  }

  activate(item: Item) {
    item.activate();

    this.broadcast({
      type: MessageType.Activate,
      id: item.id,
    });
  }

  setTurnState(turnState: TurnState) {
    if (turnState === this._turnState) {
      return;
    }

    super.setTurnState(turnState);

    this.broadcast({
      type: MessageType.turnState,
      state: turnState,
    });
  }
}
