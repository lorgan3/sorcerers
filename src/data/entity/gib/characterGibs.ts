import { Gib } from ".";
import { AssetsContainer } from "../../../util/assets/assetsContainer";
import { circle3x3 } from "../../collision/precomputed/circles";

export const createCharacterGibs = (x: number, y: number) => {
  const atlas = AssetsContainer.instance.assets!["atlas"];

  const head = new Gib({
    texture: atlas.textures["gibs_head"],
    mask: circle3x3,
    offsetX: -7,
    offsetY: -9,
    bloody: true,
  });
  head.body.move(x, y);

  const arm = new Gib({
    texture: atlas.textures["gibs_arm"],
    mask: circle3x3,
    offsetX: -3,
    offsetY: 3,
    bloody: true,
  });
  arm.body.move(x + 3, y + 6);

  const wand = new Gib({
    texture: atlas.textures["gibs_wand"],
    mask: circle3x3,
    offsetX: 0,
    offsetY: -12,
  });
  wand.body.move(x - 3, y + 6);

  const legL = new Gib({
    texture: atlas.textures["gibs_leg"],
    mask: circle3x3,
    offsetX: 0,
    offsetY: -6,
    bloody: true,
  });
  legL.body.move(x + 1, y + 12);

  const legR = new Gib({
    texture: atlas.textures["gibs_leg"],
    mask: circle3x3,
    offsetX: 0,
    offsetY: -6,
    bloody: true,
  });
  legR.body.move(x - 1, y + 12);

  return [head, arm, wand, legL, legR];
};
