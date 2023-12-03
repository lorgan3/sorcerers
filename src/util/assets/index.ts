import { Assets } from "@pixi/assets";
import Eternal from "../../assets/Eternal.ttf";

Assets.addBundle("assets", {
  atlas: `${import.meta.env.BASE_URL}atlas.json`,
  map: `${import.meta.env.BASE_URL}arena_well.png`,
  sky: `${import.meta.env.BASE_URL}sky.png`,
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
