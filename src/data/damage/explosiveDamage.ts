import {
  circle16x16,
  circle24x24,
  circle32x32,
  circle64x64,
  circle9x9,
} from "../collision/precomputed/circles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";
import { isHurtableEntity } from "../entity/types";
import { ControllableSound } from "../../sound/controllableSound";
import { Sound } from "../../sound";

const DEFAULT_POWER = 5;
const DEFAULT_DAMAGE_MULTIPLIER = 5;

export class ExplosiveDamage implements DamageSource {
  static RangeToMaskMap = {
    32: circle64x64,
    16: circle32x32,
    12: circle24x24,
    8: circle16x16,
    4: circle9x9,
  };

  private static gradientMultiplier = 1.2;
  private static gradients = ExplosiveDamage.preComputeGradients();

  private static preComputeGradients() {
    const gradients: Record<number, OffscreenCanvas> = {};

    for (let key in ExplosiveDamage.RangeToMaskMap) {
      const r = Math.ceil(Number(key) * ExplosiveDamage.gradientMultiplier);

      const canvas = new OffscreenCanvas(r * 2, r * 2);
      const ctx = canvas.getContext("2d")!;

      const gradient = ctx.createRadialGradient(r, r, r / 2, r, r, r);
      gradient.addColorStop(0, "#000000f0");
      gradient.addColorStop(1, "#00000000");
      ctx.arc(r, r, r, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      gradients[Number(key)] = canvas;
    }

    return gradients;
  }

  public readonly type = DamageSourceType.Explosive;

  constructor(
    public readonly x: number,
    public readonly y: number,
    private range: number,
    private power = DEFAULT_POWER,
    private damageMultiplier = DEFAULT_DAMAGE_MULTIPLIER,
    private targets?: TargetList
  ) {}

  damage() {
    Level.instance.terrain.draw((ctx) => {
      const offset = Math.ceil(this.range * ExplosiveDamage.gradientMultiplier);
      ctx.drawImage(
        ExplosiveDamage.gradients[this.range],
        this.x - offset,
        this.y - offset
      );
    });

    Level.instance.terrain.subtractCircle(
      this.x,
      this.y,
      this.range,
      ExplosiveDamage.RangeToMaskMap[
        this.range as keyof typeof ExplosiveDamage.RangeToMaskMap
      ]
    );

    if (this.range <= 8) {
      ControllableSound.fromEntity(
        [this.x * 6, this.y * 6],
        Sound.ExplosionSmall
      );
    } else {
      ControllableSound.fromEntity(
        [this.x * 6, this.y * 6],
        Sound.ExplosionMedium
      );
    }

    this.getTargets().damage(this);
  }

  serialize() {
    return [this.x, this.y, this.range, this.targets?.serialize()] as const;
  }

  getTargets() {
    if (!this.targets) {
      this.targets = new TargetList();

      const range = (this.range + 5) * 6;
      Level.instance.withNearbyEntities(
        this.x * 6,
        this.y * 6,
        range,
        (entity, distance) => {
          if (isHurtableEntity(entity)) {
            const [x, y] = entity.getCenter();
            this.targets!.add(
              entity,
              (2 + 8 * ((range - distance) / range)) * this.damageMultiplier,
              {
                power: this.power,
                direction: Math.atan2(y - this.y * 6, x - this.x * 6),
              }
            );
          }
        }
      );
    }

    return this.targets;
  }

  static deserialize(data: ReturnType<ExplosiveDamage["serialize"]>) {
    return new ExplosiveDamage(
      data[0],
      data[1],
      data[2],
      DEFAULT_POWER,
      DEFAULT_DAMAGE_MULTIPLIER,
      TargetList.deserialize(data[3])
    );
  }
}
