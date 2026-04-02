import { AnimatedSprite } from "pixi.js";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { getLevel } from "../data/context";
import { ControllableSound } from "../sound/controllableSound";
import { Sound } from "../sound";

export class Lightning extends AnimatedSprite {
  private static lengthMultiplier = 90;

  constructor(x: number, y: number, length: number, direction: number) {
    super(
      AssetsContainer.instance.assets!["atlas"].animations["spells_lightning"]
    );

    this.anchor.set(0.1, 0.5);
    this.position.set(x, y);
    this.loop = false;
    this.scale.set(length / Lightning.lengthMultiplier, 3);
    this.rotation = direction;
    this.animationSpeed = 0.3;
    this.play();

    ControllableSound.fromEntity([x, y], Sound.Whip);

    getLevel().add(this);
    this.onComplete = () => getLevel().remove(this);
  }
}
