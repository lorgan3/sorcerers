import { Graphics } from "pixi.js";
import { BaseItem } from "./baseItem";
import { EntityType } from "./types";
import { Character } from "./character";
import { getServer } from "../context";

export class ChaosCrystal extends BaseItem {
  public readonly type = EntityType.ChaosCrystal;

  constructor(x: number, y: number, _appeared: boolean) {
    super(x, y, _appeared);

    const graphic = new Graphics()
      .regularPoly(27, 27, 14, 6)
      .fill(0x882288)
      .regularPoly(27, 27, 6, 6)
      .fill(0xffaaff);
    this.addChild(graphic);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }

  serializeCreate(): [number, number, boolean] {
    return [...this.body.precisePosition, this._appeared];
  }

  static create(data: ReturnType<ChaosCrystal["serializeCreate"]>): ChaosCrystal {
    return new ChaosCrystal(...data);
  }

  activate(character?: Character) {
    super.activate(character);

    const server = getServer();
    if (server) {
      server.triggerSuddenDeath();
    }
  }
}
