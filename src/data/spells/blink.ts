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
import { Smoke } from "../../graphics/smoke";
import { map } from "../../util/math";
import { Server } from "../network/server";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

export class Blink extends Container implements TickingEntity {
  private static blinkStartTime = 45;
  private static blinkTime = 70;
  private static particleSpeed = 10;
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
        lifeTime: 17,
        lifeTimeVariance: 1,
        spawnRange: 96,
        spawnFrequency: 0.2,
        tint: 0xff66ef,
        initialize: () => ({
          x: cx,
          y: cy,
          xVelocity: x * Blink.particleSpeed,
          yVelocity: y * Blink.particleSpeed,
          scale: map(1, 2, Math.random()),
        }),
      }
    );
    Level.instance.particleContainer.addEmitter(this.particles);
  }

  tick(dt: number): void {
    this.time += dt;

    if (this.time >= Blink.blinkStartTime && this.character.visible) {
      const [cx, cy] = this.character.getCenter();
      new Smoke(cx, cy, -Math.sign(Math.cos(this.direction)) || 1);
      ControllableSound.fromEntity(this.character, Sound.Smoke);
      this.character.visible = false;
    }

    if (this.time > Blink.blinkTime) {
      const [cx, cy] = this.character.getCenter();
      const x = Math.round(
        cx / 6 + Math.cos(this.direction) * Blink.blinkDistance
      );
      const y = Math.round(
        cy / 6 + Math.sin(this.direction) * Blink.blinkDistance
      );

      Server.instance?.damage(
        new ExplosiveDamage(
          x + 3,
          y + 4,
          12,
          3,
          3 + 2.5 * Manager.instance.getElementValue(Element.Physical)
        ),
        this.character.player
      );
      new Implosion(x * 6, y * 6);
      this.character.move(x, y);
      this.character.position.set(x * 6, y * 6);
      this.character.visible = true;

      Level.instance.remove(this);
      Level.instance.particleContainer.destroyEmitter(this.particles);
      this.character.setSpellSource(this, false);
      Manager.instance.setTurnState(TurnState.Ending);
    }
  }
}
