import { Character } from "../entity/character";
import { circle16x16 } from "../collision/precomputed/circles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";

export class ImpactDamage implements DamageSource {
  public readonly type = DamageSourceType.Impact;

  constructor(
    public readonly x: number,
    public readonly y: number,
    private direction: number,
    private targets?: TargetList
  ) {}

  damage() {
    Level.instance.terrain.subtractCircle(this.x, this.y, 8, circle16x16);

    if (!this.targets) {
      this.targets = new TargetList();

      const range = 8 * 12;
      Level.instance.withNearbyEntities(
        (this.x + 4) * 6,
        (this.y + 8) * 6,
        range,
        (entity) => {
          if (entity instanceof Character) {
            const [x, y] = entity.getCenter();
            this.targets!.add(entity, 20, {
              power: 5,
              direction: this.direction,
            });
          }

          // @TODO Damage to things that aren't characters?
        }
      );
    }

    this.targets!.damage();
  }

  serialize() {
    return [this.x, this.y, this.targets?.serialize()] as const;
  }

  static deserialize(data: ReturnType<ImpactDamage["serialize"]>) {
    return new ImpactDamage(
      data[0],
      data[1],
      0,
      TargetList.deserialize(data[2])
    );
  }
}
