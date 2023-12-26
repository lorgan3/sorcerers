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
  SyncMap,
  Popup,
  LobbyUpdate,
  StartGame,
  SelectSpell,
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
      data: any;
    }
  | {
      type: MessageType.SyncMap;
      width: number;
      height: number;
      background: Uint8ClampedArray;
      mask: Uint32Array;
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
    };

export interface Popup {
  title: string;
  meta?: string;
  duration?: number;
}
