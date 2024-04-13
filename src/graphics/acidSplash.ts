import { AnimatedSprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { Level } from "../data/map/level";

export class AcidSplash extends AnimatedSprite {
  constructor(x: number, y: number) {
    super(
      AssetsContainer.instance.assets!["atlas"].animations["spells_acidSplash"]
    );

    this.anchor.set(0.5);
    this.position.set(x, y);
    this.loop = false;
    this.scale.set(3);
    this.animationSpeed = 0.15;
    this.alpha = 0.6;
    this.play();

    Level.instance.add(this);
    this.onComplete = () => Level.instance.remove(this);
  }
}
