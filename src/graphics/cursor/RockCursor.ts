import { Container, Sprite, TilingSprite } from "pixi.js";

import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Spell } from "../../data/spells";
import { Character } from "../../data/entity/character";
import { Controller, Key } from "../../data/controller/controller";

import { Manager } from "../../data/network/manager";
import { Cursor, ProjectileConstructor } from "./types";
import { TurnState } from "../../data/network/types";
import { Level } from "../../data/map/level";

import { Server } from "../../data/network/server";
import { Rock } from "../../data/spells/rock";
import { probeX } from "../../data/map/utils";

const UPDATE_INTERVAL = 1;

interface TriggerData {
  projectile: ProjectileConstructor;
  turnState: TurnState;
}

export class RockCursor extends Container implements Cursor<TriggerData> {
  private indicator: TilingSprite;
  private pointer: Sprite;
  private lastUpdate = UPDATE_INTERVAL;
  private wasKeyDown = true;

  constructor(private character: Character, private spell: Spell<TriggerData>) {
    super();

    const atlas = AssetsContainer.instance.assets!["atlas"];
    const texture = atlas.textures["spells_newRock"];

    this.indicator = new TilingSprite({
      texture,
      width: texture.width,
      height: 0,
    });
    this.indicator.anchor.set(0.5, 0.9);
    this.indicator.scale.set(6);
    this.indicator.alpha = 0.5;

    this.pointer = new Sprite(atlas.textures["spells_arrowDown"]);
    this.pointer.anchor.set(0.4, 0.25);
    this.pointer.scale.set(2);
    this.pointer.tint = this.character.player.color;

    this.addChild(this.indicator, this.pointer);
    Level.instance.uiContainer.addChild(this);
  }

  remove(): void {
    Level.instance.uiContainer.removeChild(this);
    this.character.setSpellSource(this, false);
  }

  trigger({ projectile, turnState }: TriggerData) {
    const [x, y] = this.character.player.controller.getMouse();

    projectile.cast(x / 6, y / 6, this.character);

    Manager.instance.setTurnState(turnState);
    this.character.setSpellSource(this, false);
  }

  updateGraphic(controller: Controller) {
    if (this.character.body.onLadder) {
      this.indicator.visible = false;
      this.character.setSpellSource(this, false);
      return;
    }

    const [x, y] = controller.getMouse();
    const _x = Math.round(x / 6);
    const _y = Math.round(y / 6);

    if (Level.instance.terrain.collisionMask.collidesWithPoint(_x, _y)) {
      this.indicator.visible = false;
      this.character.setSpellSource(this, false);
      return;
    }

    let maxY = _y + 8 - Rock.maxHeightDiff;
    let minY = _y + 8 + Rock.maxHeightDiff;
    let diff = 0;
    for (let i = -24; i < 24; i++) {
      const groundY = probeX(
        Level.instance.terrain.collisionMask,
        _x + i,
        _y + 8 - Rock.maxHeightDiff
      );

      minY = Math.min(groundY, minY);
      maxY = Math.max(groundY, maxY);
    }

    this.indicator.visible = true;
    this.indicator.position.set(_x * 6, maxY * 6);
    this.indicator.height =
      Rock.maxHeightDiff + Math.min(Math.abs(minY - maxY), Rock.maxHeightDiff);
    this.indicator.scale.x = this.character.direction * 6;
  }

  tick(dt: number, controller: Controller) {
    this.lastUpdate += dt;
    if (this.lastUpdate > UPDATE_INTERVAL) {
      this.lastUpdate = 0;
      this.updateGraphic(controller);
    }

    this.pointer.position.set(...controller.getLocalMouse());
    this.pointer.scale.set(2 / Level.instance.viewport.scale.x);

    if (!this.indicator.visible) {
      this.wasKeyDown = false;
      return;
    }

    if (!this.wasKeyDown && controller.isKeyDown(Key.M1)) {
      if (Server.instance) {
        Server.instance.cast();
      }
    }

    this.wasKeyDown = controller.isKeyDown(Key.M1);
    this.character.setSpellSource(this);
  }

  serialize() {
    return null;
  }

  deserialize(): void {}
}
