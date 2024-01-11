import { Ticker } from "pixi.js";

import { Server } from "./server";
import { Level } from "../map/level";
import { KeyboardController } from "../controller/keyboardController";
import { Manager } from "./manager";
import { Map } from "../map";

export const PEER_ID_PREFIX = "sorcerers-";

export const connect = async (target: HTMLElement, map: Map) => {
  const level = new Level(target, map);
  const controller = new KeyboardController(level.viewport);

  Manager.instance.connect(controller);
  await Server.instance?.start();

  Ticker.shared.add((dt) => {
    Manager.instance.tick(dt, Ticker.shared.deltaMS);
  });

  return controller;
};
