import { Assets } from "@pixi/assets";
import Eternal from "../../assets/Eternal.ttf";
import "./mapLoader";
import { MAP_LOADER } from "./mapLoader";

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
  playground: {
    src: `${import.meta.env.BASE_URL}maps/playground.png`,
    loadParser: MAP_LOADER,
  },
  font: Eternal,
});

let promise: Promise<any> | undefined;

export const getAssets = () => {
  if (promise) {
    return promise;
  }

  promise = Assets.loadBundle("assets");
  return promise;
};
