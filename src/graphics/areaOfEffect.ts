import { AnimatedSprite, Container } from "pixi.js";
import { SimpleParticleEmitter } from "./particles/simpleParticleEmitter";
import { Element } from "../data/spells/types";
import { Level } from "../data/map/level";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { ELEMENT_ATLAS_MAP, ELEMENT_COLOR_MAP } from "./elements";
import { ParticleEmitter } from "./particles/types";
import { Layer, TickingEntity } from "../data/entity/types";
import { map } from "../util/math";

export class AreaOfEffect extends Container implements TickingEntity {
  public layer = Layer.Background;

  private static rangeMultiplier = 0.05;
  private static growDuration = 90;
  private static expansionDuration = 20;
  private static maxAlpha = 0.4;

  private emitter?: ParticleEmitter;
  private time = 0;

  private circle: AnimatedSprite;

  private growSize: number;
  private expansionSize: number;

  constructor(
    x: number,
    y: number,
    private range: number,
    private element: Element
  ) {
    super();
    this.position.set(x * 6, y * 6);

    this.expansionSize = this.range * AreaOfEffect.rangeMultiplier;
    this.growSize = Math.min(0.8, this.expansionSize / 4);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.circle = new AnimatedSprite(
      atlas.animations["spells_flatMagicCircle"]
    );
    this.circle.position.set(32, 32);
    this.circle.anchor.set(0.5);
    this.circle.animationSpeed = 0.08;
    this.circle.scale.set(0);
    this.circle.tint = ELEMENT_COLOR_MAP[element];
    this.circle.alpha = 0.0;
    this.circle.play();

    this.addChild(this.circle);

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

  tick(dt: number) {
    this.time += dt;

    if (this.time < AreaOfEffect.growDuration) {
      this.circle.scale.set(
        (this.growSize * Math.min(this.time, AreaOfEffect.growDuration)) /
          AreaOfEffect.growDuration
      );
      this.circle.alpha = map(
        0,
        AreaOfEffect.maxAlpha,
        this.time / AreaOfEffect.growDuration
      );
    } else if (
      this.time <
      AreaOfEffect.growDuration + AreaOfEffect.expansionDuration
    ) {
      const t = this.time - AreaOfEffect.growDuration;
      this.circle.scale.set(
        map(
          this.growSize,
          this.expansionSize,
          Math.min(t, AreaOfEffect.expansionDuration) /
            AreaOfEffect.expansionDuration
        )
      );
    } else {
      this.circle.scale.set(this.expansionSize);
    }
  }
}
