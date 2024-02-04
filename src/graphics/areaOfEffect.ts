import { AnimatedSprite, Container } from "pixi.js";
import { SimpleParticleEmitter } from "./particles/simpleParticleEmitter";
import { Element } from "../data/spells/types";
import { Level } from "../data/map/level";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { ELEMENT_ATLAS_MAP } from "./elements";
import { ParticleEmitter } from "./particles/types";

const RANGE_MULTIPLIER = 0.05;

export class AreaOfEffect extends Container {
  private emitter?: ParticleEmitter;

  constructor(
    x: number,
    y: number,
    private range: number,
    private element: Element
  ) {
    super();
    this.position.set(x * 6, y * 6);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    const circle = new AnimatedSprite(
      atlas.animations["spells_flatMagicCircle"]
    );
    circle.position.set(32, 32);
    circle.anchor.set(0.5);
    circle.animationSpeed = 0.2;
    circle.scale.set(range * RANGE_MULTIPLIER);
    circle.tint = 0xd98031;
    circle.alpha = 0.6;
    circle.play();

    this.addChild(circle);

    this.emitter = Level.instance.backgroundParticles.replaceEmitter(
      new SimpleParticleEmitter(
        [atlas.textures[`${ELEMENT_ATLAS_MAP[element]}_bright`]],
        {
          ...SimpleParticleEmitter.defaultConfig,
          spawnRange: range * 6,
          spawnFrequency: 0.05,
          animate: false,
          fade: true,
          lifeTime: 60,
          initialize: () => {
            return {
              x: this.position.x + 32,
              y: this.position.y + 32 + 16,
              xVelocity: Math.random() - 0.5,
              yVelocity: -0.2 - Math.random() * 0.5,
              scale: Math.random() * 0.3 + 0.4,
              alpha: Math.random() * 0.2 + 0.8,
            };
          },
        }
      ),
      this.emitter
    );
  }
}
