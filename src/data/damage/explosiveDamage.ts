import {
  circle16x16,
  circle24x24,
  circle32x32,
  circle64x64,
  circle96x96,
  circle9x9,
} from "../collision/precomputed/circles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";
import { isHurtableEntity } from "../entity/types";

const DEFAULT_POWER = 5;
const DEFAULT_DAMAGE_MULTIPLIER = 5;

export class ExplosiveDamage implements DamageSource {
  static RangeToMaskMap = {
    48: circle96x96,
    32: circle64x64,
    16: circle32x32,
    12: circle24x24,
    8: circle16x16,
    4: circle9x9,
  };

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
    Level.instance.terrain.subtractCircle(
      this.x,
      this.y,
      this.range,
      ExplosiveDamage.RangeToMaskMap[
        this.range as keyof typeof ExplosiveDamage.RangeToMaskMap
      ]
    );

    if (!this.targets) {
      this.targets = new TargetList();

      const range = this.range * 12;
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

    this.targets!.damage();
  }

  serialize() {
    return [this.x, this.y, this.range, this.targets?.serialize()] as const;
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
