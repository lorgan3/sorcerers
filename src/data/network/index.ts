import { Ticker, TickerCallback, UPDATE_PRIORITY } from "pixi.js";

import { Server } from "./server";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import { Manager } from "./manager";
import { Map } from "../map";
import { FIXED_INTERVAL } from "./constants";
import Peer from "peerjs";
import { Client } from "./client";
import { GameSettings } from "../../util/localStorage/settings";

export const connect = async (
  target: HTMLElement,
  map: Map,
  settings: GameSettings,
  onBack: () => void
) => {
  const level = new Level(target, map);
  const controller = new KeyboardController(level.viewport);

  const ticker: TickerCallback<null> = (ticker) => {
    Manager.instance.tick(ticker.deltaTime);
  };

  let fixedTick = window.setInterval(
    () => Manager.instance.fixedTick(FIXED_INTERVAL),
    FIXED_INTERVAL
  );

  const handleBack = () => {
    Ticker.shared.remove(ticker, null);
    window.clearInterval(fixedTick);
    onBack();
  };

  Manager.instance.connect(controller, settings, handleBack);
  await Server.instance?.start();

  Ticker.shared.add(ticker, null, UPDATE_PRIORITY.LOW);

  return controller;
};

export const createClient = () =>
  new Promise<void>((resolve) => {
    const create = () => {
      Manager.instance?.destroy();

      const peer = new Peer();

      peer.on("error", () => {
        peer.destroy();
        create();
      });

      peer.once("open", () => {
        peer.off("error");
        new Client(peer);

        resolve();
      });
    };

    create();
  });
