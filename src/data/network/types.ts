import { DamageSourceType } from "../damage/types";
import { EntityType } from "../entity/types";
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
      players: Array<{
        characters: number[][];
      }>;
    }
  | {
      type: MessageType.ActiveUpdate;
      data: number[];
    }
  | {
      type: MessageType.ActiveCharacter;
      activePlayer: number;
      activeCharacter: number;
      windSpeed: number;
      turnStartTime: number;
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
      players: string[];
    }
  | {
      type: MessageType.StartGame;
      map: Config;
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
    };

export interface Popup {
  title: string;
  meta?: string;
  duration?: number;
}

export enum TurnState {
  Ongoing,
  Attacked,
  Ending,
}
