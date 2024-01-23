import { Container, Sprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";
import { Level } from "../../data/map/level";
import { Manager } from "../../data/network/manager";
import { TurnState } from "../../data/network/types";
import { Element } from "../../data/spells/types";

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
    private controller: Controller,
    private source: Character
  ) {
    super();
    this.pivot.set(16, 0);
    const atlas = AssetsContainer.instance.assets!["atlas"].textures;

    this.arrowBody = new Sprite(atlas["spells_arrowBody"]);
    this.arrowBody.scale.y = -1;
    this.arrowBody.position.x = SPRITE_SIZE / 2;
    this.arrowBody.anchor.set(0.5, 0);
    this.arrowTip = new Sprite(atlas["spells_arrowTip"]);
    this.arrowTip.scale.y = -1;
    this.addChild(this.arrowBody, this.arrowTip);
    this.source.setSpellSource(this);
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
        const power =
          Math.sqrt(distance / 5) *
          Manager.instance.getElementValue(Element.Arcane);

        this.character.body.addAngularVelocity(
          power,
          this.rotation + Math.PI / 2
        );
        Level.instance.remove(this);
        this.source.setSpellSource(this, false);
        Manager.instance.setTurnState(TurnState.Ending);
      }
    }
  }

  static cast(
    x: number,
    y: number,
    character: Character,
    controller: Controller,
    source: Character
  ) {
    const entity = new Telekinesis(x, y, character, controller, source);

    Level.instance.add(entity);
    return entity;
  }
}
