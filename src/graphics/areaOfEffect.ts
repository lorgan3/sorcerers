import { Container, Sprite } from "pixi.js";
import { SimpleParticleEmitter } from "./particles/simpleParticleEmitter";
import { Element } from "../data/spells/types";
import { getLevel } from "../data/context";
import { AssetsContainer } from "../util/assets/assetsContainer";
import { ELEMENT_ATLAS_MAP, ELEMENT_COLOR_MAP } from "./elements";
import { ParticleEmitter } from "./particles/types";
import { Layer, TickingEntity } from "../data/entity/types";
import { map } from "../util/math";
import { ControllableSound } from "../sound/controllableSound";
import { Sound } from "../sound";

export class AreaOfEffect extends Container implements TickingEntity {
  public layer = Layer.Background;

  private static rangeMultiplier = 0.05 / 6;
  private static growDuration = 90;
  private static expansionDuration = 20;
  private static maxAlpha = 0.4;
  private static rotationSpeed = Math.PI / 150;
  // Concentric outline radii (normalized to texture half-width), matching the
  // three rings in the rune-circle artwork.
  private static ringRadii = [0.625, 0.75, 0.875];
  private static hubRadius = 0.1;
  private static particleStep = 0.04;

  private emitter?: ParticleEmitter;
  private time = 0;

  private circle: Sprite;

  private growSize: number;
  private expansionSize: number;
  private expanded = false;

  constructor(
    x: number,
    y: number,
    private range: number,
    private element: Element
  ) {
    super();
    this.position.set(x, y);

    this.expansionSize = this.range * AreaOfEffect.rangeMultiplier;
    this.growSize = Math.min(0.8, this.expansionSize / 4);

    const atlas = AssetsContainer.instance.assets!["atlas"];

    this.circle = new Sprite(atlas.textures["spells_flatMagicCircle"]);
    this.circle.anchor.set(0.5);
    this.circle.scale.set(0);
    this.circle.tint = ELEMENT_COLOR_MAP[element];
    this.circle.alpha = 0.0;

    this.addChild(this.circle);

    this.emitter = getLevel().backgroundParticles.replaceEmitter(
      new SimpleParticleEmitter(
        [atlas.textures[`${ELEMENT_ATLAS_MAP[element]}_bright`]],
        {
          ...SimpleParticleEmitter.defaultConfig,
          spawnRange: range,
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
    this.rotation -= AreaOfEffect.rotationSpeed * dt;

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
      if (!this.expanded) {
        this.expanded = true;
        ControllableSound.fromEntity(
          [this.position.x, this.position.y],
          Sound.Schwing
        );
      }
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

  fade() {
    const level = getLevel();
    level.backgroundParticles.destroyEmitter(this.emitter);

    const tint = ELEMENT_COLOR_MAP[this.element];
    const radius = (this.circle.texture.width / 2) * this.expansionSize;
    const cx = this.position.x;
    const cy = this.position.y;
    const mask = level.terrain.collisionMask;
    const step = AreaOfEffect.particleStep;

    const spawn = (nx: number, ny: number) => {
      const rx = nx * radius;
      const ry = ny * radius;
      const px = cx + rx;
      const py = cy + ry;

      if (mask.collidesWithPoint((px / 6) | 0, (py / 6) | 0)) {
        return;
      }

      const dist = Math.sqrt(rx * rx + ry * ry) || 1;
      const speed = 0.5 + Math.random() * 2.5;
      level.bloodEmitter.spawn(
        px,
        py,
        (rx / dist) * speed,
        (ry / dist) * speed - 1,
        tint,
        AreaOfEffect.maxAlpha
      );
    };

    // Solid hub
    for (let r = 0; r <= AreaOfEffect.hubRadius; r += step) {
      const count = Math.max(1, Math.round((2 * Math.PI * r) / step));
      for (let i = 0; i < count; i++) {
        const a = this.rotation + (i / count) * Math.PI * 2;
        spawn(Math.cos(a) * r, Math.sin(a) * r);
      }
    }

    // Concentric outlines
    for (const r of AreaOfEffect.ringRadii) {
      const count = Math.round((2 * Math.PI * r) / step);
      for (let i = 0; i < count; i++) {
        const a = this.rotation + (i / count) * Math.PI * 2;
        spawn(Math.cos(a) * r, Math.sin(a) * r);
      }
    }

    level.remove(this);
  }
}
