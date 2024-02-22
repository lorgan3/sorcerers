import { Sprite } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { EntityType } from "./types";
import { Character } from "./character";
import { POTION_DATA, PotionType } from "./potionData";
import { BaseItem } from "./baseItem";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class Potion extends BaseItem {
  public readonly type = EntityType.Potion;

  constructor(x: number, y: number, private potionType: PotionType) {
    super(x, y);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const sprite = new Sprite(atlas.textures[POTION_DATA[potionType].sprite]);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(26, 30);
    sprite.scale.set(3);

    // const sprite2 = new Sprite(Texture.fromBuffer(circle9x9Canvas.data, 9, 9));
    // sprite2.anchor.set(0);
    // sprite2.alpha = 0.3;
    // sprite2.scale.set(6);

    this.addChild(sprite);
  }

  serialize() {
    return this.body.serialize();
  }

  deserialize(data: any[]) {
    this.body.deserialize(data);
  }

  serializeCreate(): [number, number, PotionType] {
    return [...this.body.precisePosition, this.potionType];
  }

  static create(data: ReturnType<Potion["serializeCreate"]>): Potion {
    return new Potion(...data);
  }

  activate(character: Character) {
    super.activate(character);

    ControllableSound.fromEntity(this, Sound.Potion);
    POTION_DATA[this.potionType].activate(character);
  }
}
