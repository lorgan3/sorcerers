import { Ticker } from "pixi.js";
import { Client } from "./client";
import { Server } from "./server";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import Peer from "peerjs";
import { Manager } from "./manager";
import { Team } from "../team";
import { Map } from "../map";

export const DEFAULT_SERVER_ID = "lorgan3";
export const PEER_ID_PREFIX = "sorcerers-";

export const connect = async (target: HTMLElement, map: Map) => {
  const level = new Level(target, map);
  const controller = new KeyboardController(level.viewport);

  if (Manager.instance) {
    Manager.instance.connect(controller);
    await Server.instance?.start();

    Ticker.shared.add((dt) => {
      Manager.instance.tick(dt, Ticker.shared.deltaMS);
    });

    return;
  }

  const server = new Server(new Peer(DEFAULT_SERVER_ID));

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
      server.connect(controller);
      server.start();

      Ticker.shared.add((dt) => {
        server.tick(dt, Ticker.shared.deltaMS);
      });
    })
    .catch(() => {
      const client = new Client(new Peer());

      window.setTimeout(() => {
        client.join(DEFAULT_SERVER_ID, "Client", Team.random());
        client.connect(controller);

        Ticker.shared.add((dt) => {
          client.tick(dt, Ticker.shared.deltaMS);
        });
      }, 300);
    });
};
