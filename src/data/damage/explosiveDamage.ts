import { DamageSource } from ".";
import { circle32x32, circle9x9 } from "../collision/precomputed/circles";
import { Level } from "../level";

export class ExplosiveDamage implements DamageSource {
  static RangeToMaskMap = {
    16: circle32x32,
    4: circle9x9,
  };

  constructor(
    public readonly x: number,
    public readonly y: number,
    private range: number
  ) {}

  damage() {
    Level.instance.terrain.subtract(
      this.x,
      this.y,
      this.range,
      ExplosiveDamage.RangeToMaskMap[
        this.range as keyof typeof ExplosiveDamage.RangeToMaskMap
      ]
    );

    const range = this.range * 6;
    Level.instance.withNearbyEntities(
      this.x * 6,
      this.y * 6,
      this.range * 6,
      (entity, distance) => {
        entity.hp -= 10 + 40 * ((range - distance) / range);
      }
    );
  }

  serialize() {
    return [this.x, this.y, this.range];
  }

  static deserialize(data: any[]) {
    return new ExplosiveDamage(data[0], data[1], data[2]);
  }
}
