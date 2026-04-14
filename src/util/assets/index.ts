import Eternal from "../../assets/Eternal.ttf";
import "./mapLoader";
import { MAP_LOADER } from "./mapLoader";
import { SOUND_ASSETS } from "../../sound";
import { Assets } from "pixi.js";

export const loadAsMap = (src: string) => ({
  src,
  loadParser: MAP_LOADER,
});

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
  characters: `${import.meta.env.BASE_URL}characters.json`,
  backgrounds: `${import.meta.env.BASE_URL}backgrounds.json`,
  font: Eternal,
  ...SOUND_ASSETS,
});

let promise: Promise<any> | undefined;

export const getAssets = () => {
  if (promise) {
    return promise;
  }

  promise = Assets.loadBundle("assets");
  return promise;
};
