import { AnimatedSprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { getLevel } from "../data/context";

export class Explosion extends AnimatedSprite {
  constructor(x: number, y: number) {
    super(
      AssetsContainer.instance.assets!["atlas"].animations["spells_explosion"]
    );

    this.anchor.set(0.5);
    this.position.set(x, y);
    this.loop = false;
    this.scale.set(3);
    this.animationSpeed = 0.3;
    this.play();

    getLevel().add(this);
    this.onComplete = () => getLevel().remove(this);
  }
}
