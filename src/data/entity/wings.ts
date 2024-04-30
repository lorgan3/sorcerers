import { AnimatedSprite, Container } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Character } from "./character";
import { map } from "../../util/math";
import { Level } from "../map/level";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";
import { Manager } from "../network/manager";
import { Element } from "../spells/types";

export class Wings extends Container {
  private static fullPower = 100;
  private static flapCost = 8;
  private static maxScale = 4;
  private static minScale = 1;
  private static flapThreshHold = 0.8;
  private static lift = 3.5;

  private sprite: AnimatedSprite;
  private particles: SimpleParticleEmitter;

  private _power = Wings.fullPower;

  constructor(private character: Character) {
    super();
    this.character.body.gravity = 0.14;
    this._power =
      Wings.fullPower *
      (0.7 + Manager.instance.getElementValue(Element.Physical) * 0.3);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.sprite = new AnimatedSprite(atlas.animations["wings"]);
    this.sprite.scale.set(Wings.maxScale);
    this.sprite.position.set(18, 28);
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = 0.2;
    this.sprite.play();

    this.addChild(this.sprite);

    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        spawnRange: 64,
        spawnFrequency: 0,
        initialize: () =>
          Math.random() > 0.5
            ? {
                x: this.character.position.x - 24,
                y: this.character.position.y + 40,
                xVelocity: -2,
                yVelocity: 2,
                scale: map(0.5, 2, Math.random()),
              }
            : {
                x: this.character.position.x + 78,
                y: this.character.position.y + 40,
                xVelocity: 2,
                yVelocity: 2,
                scale: map(0.5, 2, Math.random()),
              },
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
    ControllableSound.fromEntity(this.character, Sound.Wing);
  }

  flap() {
    if (
      this.character.body.grounded ||
      this.character.body.yVelocity > Wings.flapThreshHold
    ) {
      this.character.body.addVelocity(
        0,
        -this.character.body.yVelocity - Wings.lift
      );

      this._power = Math.max(0, this._power - Wings.flapCost);
      this.sprite.scale.set(map(Wings.minScale, Wings.maxScale, this.power));
      this.particles.burst(10);
      ControllableSound.fromEntity(this.character, Sound.Jump);
    }
  }

  stop() {
    this.character.body.gravity = 0.2;
    Level.instance.particleContainer.destroyEmitter(this.particles);
  }

  get power() {
    return this._power / Wings.fullPower;
  }
}
