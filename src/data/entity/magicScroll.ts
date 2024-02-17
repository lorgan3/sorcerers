import { Sprite } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Element } from "../spells/types";
import { ELEMENT_ATLAS_MAP } from "../../graphics/elements";
import { AreaOfEffect } from "../../graphics/areaOfEffect";
import { BaseItem } from "./baseItem";
import { EntityType } from "./types";
import { Character } from "./character";

export class MagicScroll extends BaseItem {
  static aoeRange = 64 * 6;

  public readonly type = EntityType.MagicScroll;
  private aoe?: AreaOfEffect;

  constructor(x: number, y: number, public readonly element: Element) {
    super(x, y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const sprite = new Sprite(atlas.textures["items_scroll"]);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(24, 24);
    sprite.scale.set(2);

    const glyph = new Sprite(atlas.textures[ELEMENT_ATLAS_MAP[element]]);
    glyph.anchor.set(0.5, 0.5);
    glyph.position.set(20, 28);
    glyph.rotation = Math.PI / 12;

    // const sprite2 = new Sprite(Texture.fromBuffer(circle9x9Canvas.data, 9, 9));
    // sprite2.anchor.set(0);
    // sprite2.alpha = 0.3;
    // sprite2.scale.set(6);

    this.addChild(sprite, glyph);
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

  die() {
    super.die();
    this.aoe?.fade();
  }

  activate(character: Character) {
    super.activate(character);

    this.aoe = new AreaOfEffect(
      ...this.getCenter(),
      MagicScroll.aoeRange,
      this.element
    );
    Level.instance.add(this.aoe);
  }
}
