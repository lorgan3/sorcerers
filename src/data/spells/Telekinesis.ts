import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Character } from "../character";
import { Controller, Key } from "../controller/controller";
import { Level } from "../map/level";
import { Manager } from "../network/manager";

const MIN_DISTANCE = 32;
const MAX_DISTANCE = 320;
const SPRITE_SIZE = 32;

export class Telekinesis extends Container {
  private arrowBody: Sprite;
  private arrowTip: Sprite;
  private activated = true;

  constructor(
    x: number,
    y: number,
    private character: Character,
    private controller: Controller
  ) {
    super();
    this.pivot.set(16, 0);
    const atlas = AssetsContainer.instance.assets!["atlas"].textures;

    this.arrowBody = new Sprite(atlas["spells_arrowBody.png"]);
    this.arrowBody.scale.y = -1;
    this.arrowBody.position.x = SPRITE_SIZE / 2;
    this.arrowBody.anchor.set(0.5, 0);
    this.arrowTip = new Sprite(atlas["spells_arrowTip.png"]);
    this.arrowTip.scale.y = -1;
    this.addChild(this.arrowBody, this.arrowTip);
  }

  tick() {
    const position = this.character.getCenter();

    this.position.set(...position);

    const mouse = this.controller.getMouse();
    this.rotation =
      Math.atan2(position[1] - mouse[1], position[0] - mouse[0]) + Math.PI / 2;

    const realDistance = Math.sqrt(
      (position[1] - mouse[1]) ** 2 + (position[0] - mouse[0]) ** 2
    );

    const distance = Math.max(
      Math.min(realDistance, MAX_DISTANCE),
      MIN_DISTANCE
    );

    this.arrowBody.scale.y = distance / SPRITE_SIZE;
    this.arrowBody.scale.x = 2 - this.arrowBody.scale.y / 10;
    this.arrowTip.position.y = SPRITE_SIZE / 2 + distance;

    if (this.controller.isKeyDown(Key.M1)) {
      this.activated = true;
    }

    if (!this.controller.isKeyDown(Key.M1) && this.activated) {
      if (realDistance < MIN_DISTANCE / 2) {
        // Probably a mistake, wait for the mouse to be clicked again.
        this.activated = false;
      } else {
        const power = Math.sqrt(distance / 4);
        this.character.body.addAngularVelocity(
          power,
          this.rotation + Math.PI / 2
        );
        Level.instance.remove(this);
        Manager.instance.endTurn();
      }
    }
  }
}
