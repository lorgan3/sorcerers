import { AnimatedSprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";

export class SpawnPoint extends AnimatedSprite {
  private static animationSpeed = 0.4;

  constructor(x: number, y: number) {
    super(
      AssetsContainer.instance.assets!["atlas"].animations["spells_magicCircle"]
    );

    this.anchor.set(0.5);
    this.position.set(x, y);
    this.scale.set(0.5);
    this.animationSpeed = SpawnPoint.animationSpeed;
    this.play();
  }
}
