import { Assets } from "@pixi/assets";
import Eternal from "../../assets/Eternal.ttf";
import "./mapLoader";
import { MAP_LOADER } from "./mapLoader";
import { SOUND_ASSETS } from "../../sound";

export const defaultMaps = {
  Playground: `${import.meta.env.BASE_URL}maps/playground.png`,
  Castle: `${import.meta.env.BASE_URL}maps/castle.png`,
  Stadium: `${import.meta.env.BASE_URL}maps/stadium.png`,
};

export const loadAsMap = (src: string) => ({
  src,
  loadParser: MAP_LOADER,
});

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
  font: Eternal,
  ...Object.fromEntries(
    Object.entries(defaultMaps).map(([key, value]) => [key, loadAsMap(value)])
  ),
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
