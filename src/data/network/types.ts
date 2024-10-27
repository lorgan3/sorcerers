import { GameSettings } from "../../util/localStorage/settings";
import { DamageSourceType } from "../damage/types";
import { EntityType, Priority } from "../entity/types";
import { Config } from "../map";

export enum MessageType {
  Initialize,
  InputState,
  EntityUpdate,
  ActiveUpdate,
  ActiveCharacter,
  SpawnCharacter,
  SyncPlayers,
  Join,
  SyncDamage,
  Popup,
  LobbyUpdate,
  StartGame,
  SelectSpell,
  ClientReady,
  Die,
  Spawn,
  DynamicUpdate,
  Focus,
  Highlight,
  Activate,
  turnState,
  Sink,
  Cast,
  EndGame,
}

export type Message =
  | {
      type: MessageType.Initialize;
      data: string;
    }
  | {
      type: MessageType.InputState;
      data: [number, number, number];
    }
  | {
      type: MessageType.EntityUpdate;
      priority: Priority;
      entities: any[];
    }
  | {
      type: MessageType.ActiveUpdate;
      data: any[];
      cursor: any;
      inputState: [number, number, number];
    }
  | {
      type: MessageType.ActiveCharacter;
      activePlayer: number;
      activeCharacter: number;
      elements: number[];
      turnStartTime: number;
      time: number;
      newMana: number;
    }
  | {
      type: MessageType.SpawnCharacter;
      player: number;
      name: string;
      hp: number;
      x: number;
      y: number;
    }
  | {
      type: MessageType.SyncPlayers;
      time: number;
      players: Array<{
        name: string;
        you: boolean;
        team: any[];
        color: string;
        spell: number | null;
        characters: Array<{
          id: number;
          name: string;
          hp: number;
          x: number;
          y: number;
        }>;
      }>;
    }
  | {
      type: MessageType.Join;
      name: string;
      team: any[];
    }
  | {
      type: MessageType.SyncDamage;
      kind: DamageSourceType;
      data: any;
    }
  | {
      type: MessageType.Popup;
      title: string;
      meta?: string;
      duration?: number;
    }
  | {
      type: MessageType.LobbyUpdate;
      map: string;
      players: Array<{ name: string; characters: string[]; color: string }>;
      you: number;
      settings: GameSettings;
    }
  | {
      type: MessageType.StartGame;
      map: Config;
      settings: GameSettings;
    }
  | {
      type: MessageType.SelectSpell;
      spell: number;
      player?: number;
    }
  | {
      type: MessageType.ClientReady;
    }
  | {
      type: MessageType.Die;
      id: number;
    }
  | {
      type: MessageType.Spawn;
      kind: EntityType;
      id: number;
      data: any;
    }
  | {
      type: MessageType.DynamicUpdate;
      kind: EntityType;
      id: number;
      data: any;
    }
  | {
      type: MessageType.Focus;
      id: number;
    }
  | {
      type: MessageType.Highlight;
      id: number;
    }
  | {
      type: MessageType.Activate;
      id: number;
      tId?: number;
    }
  | {
      type: MessageType.turnState;
      state: TurnState;
    }
  | {
      type: MessageType.Sink;
      level: number;
    }
  | {
      type: MessageType.Cast;
      state: any; // Extra cursor data
    }
  | {
      type: MessageType.EndGame;
      stats: any[];
    };

export interface Popup {
  title: string;
  meta?: string;
  duration?: number;
}

export enum TurnState {
  Spawning,
  Ongoing,
  Attacked,
  Ending,
  Killing,
  Finished,
  Rising,
}
