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
  Priority,
  Spawnable,
  Syncable,
  isSpawnableEntity,
} from "../entity/types";
import { Element } from "../spells/types";
import { getRandomItem } from "../entity";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { DAMAGE_SOURCES } from "../damage";
import { GameSettings } from "../../util/localStorage/settings";
import { minutesToMs, secondsToMs } from "../../util/time";
import { getAccumulatedStats } from "./statsAccumulator";

export class Server extends Manager {
  private availableColors = [...COLORS];
  private singlePlayer = false;
  private _started = false;
  private suddenDeath = false;

  private disconnectedPlayers: Player[] = [];
  private localPlayers: Player[] = [];
  private damageQueue: DamageSource[] = [];

  private static _serverInstance?: Server;
  static get instance() {
    return Server._serverInstance!;
  }

  constructor(peer?: Peer) {
    if (Server._serverInstance !== undefined) {
      throw new Error("Server already exists!");
    }

    super(peer);
    Server._serverInstance = this;
  }

  connect(
    controller: KeyboardController,
    settings: GameSettings,
    onBack: () => void
  ) {
    if (this.controller) {
      throw new Error("Connecting an already connected server!");
    }

    super.connect(controller, settings, onBack);
    controller.isHost = true;

    for (let player of this.localPlayers) {
      player.connect(player.name, player.team, player.color, this.controller);
    }
  }

  destroy() {
    console.log("Destroying server");
    super.destroy();
    Server._serverInstance = undefined;

    for (let player of this.players) {
      player.connection?.off("data");
      player.connection?.close();
    }

    this.peer?.destroy();
  }

  addPlayer(name: string, team: Team) {
    const player = new Player();
    this.players.push(player);
    this.localPlayers.push(player);

    player.connect(name, team, this.availableColors.pop()!, this.controller);

    if (!this._self) {
      this._self = player;
    }

    return player;
  }

  async start() {
    if (this.localPlayers.length !== this.players.length) {
      Server.instance.broadcast({
        type: MessageType.StartGame,
        map: await Level.instance.terrain.serialize(),
        settings: this.settings,
      });

      for (let player of this.localPlayers) {
        player.resolveReady();
      }
      await Promise.all(this.players.map((player) => player.ready));
    }

    for (let player of this.players) {
      for (let i = 0; i < this.settings.teamSize; i++) {
        player.addCharacter(
          new Character(
            player,
            ...Level.instance.getRandomSpawnLocation(),
            player.team.characters[i]
          )
        );
      }
    }

    this.time = 0;
    this.singlePlayer = this.players.length === 1;

    this.syncPlayers();
    this.activePlayerIndex =
      Math.floor(Math.random() * this.players.length) - 1;
    this.cycleActivePlayer();

    this._started = true;
  }

  fixedTick(dtMs: number) {
    super.fixedTick(dtMs);

    if (
      this._turnState === TurnState.Ending &&
      Level.instance.hasDeathQueue()
    ) {
      Level.instance.performDeathQueue();
    }

    if (
      this.time - this.turnStartTime > secondsToMs(this.settings.turnLength) &&
      this._turnState !== TurnState.Attacked &&
      this._turnState !== TurnState.Killing &&
      this._turnState !== TurnState.Spawning &&
      this._turnState !== TurnState.Rising &&
      this._turnState !== TurnState.Finished
    ) {
      if (this.time > minutesToMs(this.settings.gameLength)) {
        if (!this.suddenDeath) {
          this.suddenDeath = true;
          this.addPopup({
            title: "Sudden death!",
          });
        }

        this.broadcast({
          type: MessageType.Sink,
          level: Level.instance.sink(),
        });

        this.setTurnState(TurnState.Rising);
        window.setTimeout(() => this.preCycleActivePlayer(), 2000);
      } else {
        this.preCycleActivePlayer();
      }
    }

    let damageSource: DamageSource | undefined;
    while ((damageSource = this.damageQueue.pop())) {
      this.damage(damageSource);
    }

    if (this.frames % 20 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        priority: Priority.Low,
        entities: Level.instance.syncables[Priority.Low].map((entity) =>
          entity.serialize()
        ),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    } else if (this.frames % 4 === 0) {
      const data: Message = {
        type: MessageType.EntityUpdate,
        priority: Priority.High,
        entities: Level.instance.syncables[Priority.High].map((entity) =>
          entity.serialize()
        ),
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    }

    if (this.activePlayer?.activeCharacter) {
      const inputState = this.activePlayer!.controller.serialize();

      if (
        this.isControlling() &&
        (this.activePlayer === this._self || !this.settings.trustClient)
      ) {
        this.activePlayer.activeCharacter.control(this.activePlayer.controller);
      }

      const data: Message = {
        type: MessageType.ActiveUpdate,
        data: this.activePlayer!.activeCharacter.serialize(),
        cursor: this.cursor?.serialize() || null,
        inputState,
      };

      for (let player of this.players) {
        player.connection?.send(data);
      }
    }
  }

  listen(onUpdate?: () => void) {
    console.log("Server starting", this.peer);

    this.peer?.on("connection", (connection) => {
      let player = this.disconnectedPlayers.pop()!;
      if (!player) {
        player = new Player();
        player.team.setSize(this.settings.teamSize);
        this.players.push(player);
      }

      connection.on("open", async () => {
        console.log("open");
        player.reconnect(connection);

        if (this._started) {
          connection.send({
            type: MessageType.StartGame,
            map: await Level.instance.terrain.serialize(),
            settings: this.settings,
          } satisfies Message);

          await player.ready;
          this.syncSinglePlayer(player);

          const activePlayerIndex = this.players.indexOf(this.activePlayer!);
          connection.send({
            type: MessageType.ActiveCharacter,
            activePlayer: activePlayerIndex,
            activeCharacter: this.activePlayer!.active,
            elements: Object.values(this.elements),
            turnStartTime: this.turnStartTime,
            time: this.time,
            newMana: this.players[activePlayerIndex].mana,
          } as Message);

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

          this.broadcast({
            type: MessageType.Sink,
            level: Level.instance.terrain.killbox.level,
          });
        } else if (onUpdate) {
          onUpdate();
        }
      });

      connection.on("error", (error) => {
        console.error(error);
      });

      connection.on("data", (data) => {
        try {
          this.handleMessage(data as Message, player);

          if (!this._started && onUpdate) {
            onUpdate();
          }
        } catch (error) {
          console.error(`[Client error]`, error);
          connection.close();
        }
      });

      connection.on("close", () => {
        console.log("closed");

        if (!this._started) {
          this.players.splice(this.players.indexOf(player));
          player.destroy();
          this.availableColors.push(player.color);

          this.syncPlayers();
        } else {
          this.disconnectedPlayers.push(player);
          player.disconnect();
        }
        onUpdate?.();
      });
    });
  }

  kick(player: Player) {
    const localIndex = this.localPlayers.indexOf(player);
    if (localIndex === 0) {
      throw new Error("Cannot kick the host!");
    }

    if (localIndex > 0) {
      this.localPlayers.splice(localIndex, 1);

      this.players.splice(this.players.indexOf(player), 1);
      player.destroy();
      this.availableColors.push(player.color);
    } else {
      // Closing the connection takes care of splicing.
      player.connection?.close();
    }
  }

  damage(damageSource: DamageSource, cause?: Player | null) {
    if (
      damageSource
        .getTargets()
        .getEntities()
        .includes(this.getActiveCharacter()!)
    ) {
      this.setTurnState(TurnState.Ending);
    }

    if (cause) {
      damageSource.cause = cause;
    }

    damageSource.damage();

    this.broadcast({
      type: MessageType.SyncDamage,
      kind: damageSource.type,
      data: damageSource.serialize(),
    });
  }

  dealFallDamage(x: number, y: number, character: Character) {
    // Client will notify us when taking damage.
    if (
      this.settings.trustClient &&
      !!character.player.connection &&
      this.getActiveCharacter() === character
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
    damage.cause = character.lastDamageDealer || character.player;
    this.damageQueue.push(damage);
  }

  endGame() {
    this.setTurnState(TurnState.Finished);

    window.setTimeout(() => {
      this.stats = getAccumulatedStats(
        this.players
          .filter((player) => player.joined)
          .map((player) => player.stats)
      );

      this.broadcast({
        type: MessageType.EndGame,
        stats: this.stats.map((stat) => stat.serialize()),
      });
    }, 2000);
  }

  private handleMessage(message: Message, player: Player) {
    switch (message.type) {
      case MessageType.Join:
        if (this._started) {
          return;
        }

        const team = Team.fromJson(message.team, this.settings.teamSize);
        if (player.joined) {
          player.rename(message.name, team.isValid() ? team : Team.random());
          return;
        }

        const color = this.availableColors.pop();

        if (!color) {
          console.warn("Did not accept player because out of colors!");
          player.connection!.close();
          return;
        }

        player.connect(
          message.name,
          team.isValid() ? team : Team.random(),
          color
        );

        break;

      case MessageType.InputState:
        player.controller.deserialize(message.data);
        break;

      case MessageType.ActiveUpdate:
        if (!this.settings.trustClient) {
          throw new Error("Client should not be trusted!");
        }

        if (this.activePlayer !== player) {
          return;
        }

        this.activePlayer.controller.deserialize(message.inputState);
        this.activePlayer.activeCharacter.control(this.activePlayer.controller);
        this.activePlayer.activeCharacter.deserialize(message.data);
        break;

      case MessageType.SyncDamage:
        if (!this.settings.trustClient) {
          throw new Error("Client should not be trusted!");
        }

        const character = this.getActiveCharacter();
        if (this.activePlayer !== player || !character) {
          return;
        }

        const damageSource = DAMAGE_SOURCES[message.kind].deserialize(
          message.data
        );
        damageSource.cause = character.lastDamageDealer || character.player;

        this.damage(damageSource);
        break;

      case MessageType.SelectSpell:
        const spell = SPELLS[message.spell] || null;

        if (
          player.selectedSpell !== spell &&
          !player.executedSpells.includes(spell)
        ) {
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
            name: character.characterName,
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
    const options = this.players.filter(
      (player) => player.characters.length > 0
    );

    if ((options.length === 1 && !this.singlePlayer) || options.length === 0) {
      return null;
    }

    for (let i = 1; i <= this.players.length; i++) {
      const index = (this.activePlayerIndex + i) % this.players.length;

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

    let checks = 0;
    const checkSpawn = () => {
      checks++;

      if (checks > this.players.length) {
        this.cycleActivePlayer();
        return;
      }

      if (
        Math.random() * 100 >
        this.settings.itemSpawnChance / this.players.length
      ) {
        checkSpawn();
        return;
      }

      const coords = Level.instance.getRandomItemLocation();
      if (coords) {
        const item = this.create(getRandomItem(...coords));

        this.highlight(item, () => {
          item.appear();

          checkSpawn();
        });
      } else {
        checkSpawn();
      }
    };

    checkSpawn();
  }

  private cycleActivePlayer() {
    const activePlayerIndex = this.getNextPlayerIndex();

    if (activePlayerIndex === null) {
      this.endGame();
      return;
    }

    const player = this.players[activePlayerIndex];
    const activeCharacterIndex = (player.active + 1) % player.characters.length;
    const character = player.characters[activeCharacterIndex];

    if (!character) {
      this.cycleActivePlayer();
      return;
    }

    this.focus(character, () => {
      if (character.hp <= 0) {
        this.cycleActivePlayer();
        return;
      }

      this.turnStartTime = this.time;
      this._turnState = TurnState.Ongoing;
      this.randomizeElements();

      this.broadcastActiveCharacter(
        activePlayerIndex,
        player.characters.indexOf(character)
      );
      player.nextTurn();

      if (this.activePlayer?.selectedSpell) {
        this.selectSpell(this.activePlayer?.selectedSpell, this.activePlayer);
      }

      this.addPopup({
        title: `${this.activePlayer!.name}'s turn`,
        meta: MESSAGES[Math.floor(Math.random() * MESSAGES.length)].replace(
          PLACEHOLDER,
          this.activePlayer!.activeCharacter.characterName
        ),
      });
    });
  }

  setActiveCharacter(playerId: number, characterId: number) {
    if (this.localPlayers.includes(this.players[playerId])) {
      this._self = this.players[playerId];
    }

    const character = super.setActiveCharacter(playerId, characterId);
    return character;
  }

  broadcastActiveCharacter(activePlayer: number, activeCharacter: number) {
    this.setActiveCharacter(activePlayer, activeCharacter);

    this.broadcast({
      type: MessageType.ActiveCharacter,
      activePlayer: activePlayer,
      activeCharacter: this.activePlayer!.active,
      elements: Object.values(this.elements),
      turnStartTime: this.turnStartTime,
      time: this.time,
      newMana: this.players[activePlayer].mana,
    } as Message);
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

  kill(entity: HurtableEntity | Spawnable) {
    if (entity.die) {
      this.broadcast({
        type: MessageType.Die,
        id: entity.id,
      });

      entity.die();
    }
  }

  focus(target: Spawnable, callback?: () => void) {
    Level.instance.cameraTarget.setTarget(target, callback);

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

  activate(item: Item, character?: Character) {
    item.activate(character);

    this.broadcast({
      type: MessageType.Activate,
      id: item.id,
      tId: character?.id,
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

  cast(state?: any) {
    this.broadcast({
      type: MessageType.Cast,
      state,
    });

    super.cast(state);
  }

  get teamSize() {
    return this.settings.teamSize;
  }

  set teamSize(newSize: number) {
    if (this._started) {
      throw new Error("Team size is locked when game has started");
    }
    this.settings.teamSize = newSize;
  }

  get started() {
    return this._started;
  }
}
