import { Container } from "pixi.js";
import { TickingEntity } from "../entity/types";
import { SimpleParticleEmitter } from "../../graphics/particles/simpleParticleEmitter";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Level } from "../map/level";
import { Character } from "../entity/character";
import { ExplosiveDamage } from "../damage/explosiveDamage";
import { Manager } from "../network/manager";
import { Element } from "./types";
import { Implosion } from "../../graphics/implosion";
import { TurnState } from "../network/types";

export class Blink extends Container implements TickingEntity {
  private static blinkTime = 90;
  private static particleSpeed = 6;
  private static blinkDistance = 50;

  private time = 0;
  private particles: SimpleParticleEmitter;

  constructor(private direction: number, private character: Character) {
    super();
    character.setSpellSource(this);

    const x = Math.cos(direction);
    const y = Math.sin(direction);

    const [cx, cy] = character.getCenter();

    const atlas = AssetsContainer.instance.assets!["atlas"];
    this.particles = new SimpleParticleEmitter(
      atlas.animations["spells_sparkle"],
      {
        ...SimpleParticleEmitter.defaultConfig,
        lifeTime: 30,
        lifeTimeVariance: 1,
        spawnRange: 96,
        spawnFrequency: 0.2,
        tint: 0xff66ef,
        initialize: () => ({
          x: cx,
          y: cy,
          xVelocity: x * Blink.particleSpeed,
          yVelocity: y * Blink.particleSpeed,
        }),
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  tick(dt: number): void {
    this.time += dt;

    if (this.time > Blink.blinkTime) {
      const [cx, cy] = this.character.getCenter();
      const x = Math.round(
        cx / 6 + Math.cos(this.direction) * Blink.blinkDistance
      );
      const y = Math.round(
        cy / 6 + Math.sin(this.direction) * Blink.blinkDistance
      );

      Level.instance.damage(
        new ExplosiveDamage(
          x,
          y,
          16,
          3,
          5 * Manager.instance.getElementValue(Element.Physical)
        )
      );
      new Implosion(x * 6, y * 6);
      this.character.body.move(x, y);

      Level.instance.remove(this);
      Level.instance.particleContainer.destroyEmitter(this.particles);
      this.character.setSpellSource(this, false);
      Manager.instance.setTurnState(TurnState.Ending);
    }
  }
}
