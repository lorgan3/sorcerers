import { AnimatedSprite, Container } from "pixi.js";
import { Level } from "../map/level";
import { AssetsContainer } from "../../util/assets/assetsContainer";

import { Projectile } from ".";
import { Character } from "../entity/character";
import { ImpactDamage } from "../damage/impactDamage";

export class Melee extends Container implements Projectile {
  private sprite!: AnimatedSprite;

  constructor(x: number, y: number, character: Character) {
    super();

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["spells_slash"]);
    this.sprite.animationSpeed = 0.4;
    this.sprite.loop = false;
    this.sprite.play();
    this.sprite.anchor.set(0.25);
    this.sprite.position.set(x * 6, y * 6);

    this.addChild(this.sprite);

    const [cx, cy] = character.body.precisePosition;
    this.sprite.onComplete = () => {
      Level.instance.damage(
        new ImpactDamage(x, y, Math.atan2(y - cy - 20, x - cx))
      );

      Level.instance.remove(this);
    };
  }

  tick(dt: number) {}

  serialize() {
    return null;
  }

  deserialize(data: any) {}

  static cast(x: number, y: number, character: Character) {
    const entity = new Melee(x, y, character);

    Level.instance.add(entity);
    return entity;
  }
}
