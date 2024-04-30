import { AnimatedSprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { Level } from "../data/map/level";

export class Smoke extends AnimatedSprite {
  constructor(x: number, y: number, direction: number) {
    super(AssetsContainer.instance.assets!["atlas"].animations["smoke"]);

    this.anchor.set(1, 0.5);
    this.position.set(x, y);
    this.loop = false;
    this.scale.set(-3 * direction, 3);
    this.animationSpeed = 0.25;
    this.play();

    Level.instance.add(this);
    this.onComplete = () => Level.instance.remove(this);
  }
}
