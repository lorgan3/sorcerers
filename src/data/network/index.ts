import { Ticker } from "pixi.js";
import { Client } from "./client";
import { Server } from "./server";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";

export const DEFAULT_SERVER_ID = "lorgan3";

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
        server.tick(dt, Ticker.shared.deltaMS);
      });
    })
    .catch(() => {
      const client = new Client();

      window.setTimeout(() => {
        client.connect(DEFAULT_SERVER_ID, controller);

        Ticker.shared.add((dt) => {
          client.tick(dt, Ticker.shared.deltaMS);
        });
      }, 300);
    });
};
