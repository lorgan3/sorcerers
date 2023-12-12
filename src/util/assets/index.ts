import { Assets } from "@pixi/assets";
import Eternal from "../../assets/Eternal.ttf";
import "./mapLoader";
import { MAP_LOADER } from "./mapLoader";

export const defaultMaps = {
  playground: `${import.meta.env.BASE_URL}maps/playground.png`,
};

export const loadAsMap = (src: string) => ({
  src,
  loadParser: MAP_LOADER,
});

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
  playground: {
    src: `${import.meta.env.BASE_URL}maps/playground.png`,
    loadParser: MAP_LOADER,
  },
  font: Eternal,
  ...Object.fromEntries(
    Object.entries(defaultMaps).map(([key, value]) => [key, loadAsMap(value)])
  ),
});

let promise: Promise<any> | undefined;

export const getAssets = () => {
  if (promise) {
    return promise;
  }

  promise = Assets.loadBundle("assets");
  return promise;
};
