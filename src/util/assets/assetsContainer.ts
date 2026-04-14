import { BitmapFont } from "pixi.js";
import { getAssets } from ".";

export class AssetsContainer {
  assets?: Record<string, any>;

  private callback?: () => void;

  private static _instance: AssetsContainer;
  static get instance() {
    return AssetsContainer._instance;
  }

  constructor() {
    AssetsContainer._instance = this;

    getAssets().then((assets) => {
      this.assets = assets;

      BitmapFont.install({
        name: "Eternal",
        padding: 8,
        style: {
          fontFamily: "Eternal",
          fontSize: 32,
          fill: "#fff",
          dropShadow: {
            distance: 2,
            angle: 45,
          },
        },
      });

      if (this.callback) {
        this.callback();
      }
    });
  }

  onComplete(callback: () => void) {
    if (this.assets) {
      callback();
      return;
    }

    this.callback = callback;
  }

  get loading() {
    return this.assets === undefined;
  }
}
