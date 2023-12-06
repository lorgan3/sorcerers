import { Ticker } from "pixi.js";
import { Client } from "./client";
import { Server } from "./server";
import { Level } from "../level";
import { KeyboardController } from "../controller/keyboardController";

export const DEFAULT_SERVER_ID = "lorgan3";

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
      players: Array<{
        name: string;
        you: boolean;
        characters: Array<{
          name: string;
          hp: number;
          x: number;
          y: number;
        }>;
      }>;
      activePlayer: number;
      activeCharacter: number;
    }
  | {
      type: MessageType.Join;
      name: string;
    }
  | {
      type: MessageType.SyncDamage;
      data: any[];
    }
  | {
      type: MessageType.SyncMap;
      width: number;
      height: number;
      background: Uint8ClampedArray;
      mask: Uint32Array;
    };

export const connect = (target: HTMLElement) => {
  const level = new Level(target);

  const controller = new KeyboardController(level.viewport);
  const server = new Server(DEFAULT_SERVER_ID);

  const promise = new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, 500);
    server.peer.on("error", () => {
      window.clearTimeout(id);
      reject();
    });
  });

  promise
    .then(() => {
      server.listen();
      server.join(controller);
      level.server = server;

      Ticker.shared.add((dt) => {
        server.tick(dt);
      });
    })
    .catch(() => {
      const client = new Client();

      window.setTimeout(() => {
        client.connect(DEFAULT_SERVER_ID, controller);

        Ticker.shared.add((dt) => {
          client.tick(dt);
        });
      }, 300);
    });
};
