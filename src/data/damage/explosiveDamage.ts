import { DamageSource } from ".";
import { Character } from "../character";
import { circle32x32, circle9x9 } from "../collision/precomputed/circles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";

export class ExplosiveDamage implements DamageSource {
  static RangeToMaskMap = {
    16: circle32x32,
    4: circle9x9,
  };

  constructor(
    public readonly x: number,
    public readonly y: number,
    private range: number,
    private targets?: TargetList
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

    if (!this.targets) {
      this.targets = new TargetList();

      const range = this.range * 6;
      Level.instance.withNearbyEntities(
        this.x * 6,
        this.y * 6,
        this.range * 6,
        (entity, distance) => {
          if (entity instanceof Character) {
            this.targets!.add(entity, 10 + 40 * ((range - distance) / range), {
              power: 5,
              direction: Math.atan2(
                this.y * 6 - entity.y,
                this.x * 6 - entity.x
              ),
            });
          }

          // @TODO Damage to things that aren't characters?
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
      TargetList.deserialize(data[3])
    );
  }
}
