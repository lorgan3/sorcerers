import Eternal from "../../assets/Eternal.ttf";
import "./mapLoader";
import { MAP_LOADER } from "./mapLoader";
import { SOUND_ASSETS } from "../../sound";
import { Assets } from "pixi.js";

export const defaultMaps = {
  Playground: `${import.meta.env.BASE_URL}maps/playground.png`,
  Castle: `${import.meta.env.BASE_URL}maps/castle.png`,
  Stadium: `${import.meta.env.BASE_URL}maps/stadium.png`,
  Mario_World: `${import.meta.env.BASE_URL}maps/mario.png`,
  Office: `${import.meta.env.BASE_URL}maps/office.png`,
};

export const loadAsMap = (src: string) => ({
  src,
  loadParser: MAP_LOADER,
});

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
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
