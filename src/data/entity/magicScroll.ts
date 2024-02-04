import { Container, Sprite } from "pixi.js";
import { Level } from "../map/level";
import { Body } from "../collision/body";

import { AssetsContainer } from "../../util/assets/assetsContainer";

import { EntityType, HurtableEntity, Priority, Syncable } from "./types";

import { circle9x9 } from "../collision/precomputed/circles";
import { Force } from "../damage/targetList";
import { DamageSource } from "../damage/types";
import { Element } from "../spells/types";
import { ELEMENT_ATLAS_MAP } from "../../graphics/elements";

export class MagicScroll extends Container implements Syncable, HurtableEntity {
  public readonly body: Body;
  public id = -1;
  public readonly priority = Priority.Low;
  public readonly type = EntityType.MagicScroll;
  public hp = 1;

  private time = 0;

  constructor(x: number, y: number, private element: Element) {
    super();

    this.body = new Body(Level.instance.terrain.characterMask, {
      mask: circle9x9,
      gravity: 0.1,
      airFriction: 0.99,
      roundness: 0.6,
    });
    this.body.move(x, y);
    this.position.set(x * 6, y * 6);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const sprite = new Sprite(atlas.textures["items_scroll"]);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(24, 16);
    sprite.scale.set(2);

    const glyph = new Sprite(atlas.textures[ELEMENT_ATLAS_MAP[element]]);
    glyph.anchor.set(0.5, 0.5);
    glyph.position.set(20, 20);
    glyph.rotation = Math.PI / 12;

    this.addChild(sprite, glyph);
  }

  damage(
    source: DamageSource,
    damage: number,
    force?: Force | undefined
  ): void {
    if (force) {
      this.body.addAngularVelocity(force.power, force.direction);
    }
  }

  getCenter(): [number, number] {
    return [this.position.x + 27, this.position.y + 27];
  }

  tick(dt: number) {
    this.time += dt;
    if (this.time > 30) {
      this.body.active = 1;
    }

    if (this.body.active) {
      this.time = 0;

      if (this.body.tick(dt)) {
        const [x, y] = this.body.precisePosition;
        this.position.set(x * 6, y * 6);
      }

      Level.instance.withNearbyEntities(
        this.position.x,
        this.position.y,
        32 * 6,
        console.log
      );
    }
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }

  serializeCreate(): [number, number, Element] {
    return [...this.body.precisePosition, this.element];
  }

  static create(data: ReturnType<MagicScroll["serializeCreate"]>): MagicScroll {
    return new MagicScroll(...data);
  }

  die() {}
}
