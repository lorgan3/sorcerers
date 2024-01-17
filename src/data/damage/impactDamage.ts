import { circle16x16 } from "../collision/precomputed/circles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";
import { isHurtableEntity } from "../entity/types";

export class ImpactDamage implements DamageSource {
  public readonly type = DamageSourceType.Impact;

  constructor(
    public readonly x: number,
    public readonly y: number,
    private direction: number,
    public targets?: TargetList
  ) {}

  damage() {
    Level.instance.terrain.subtractCircle(this.x, this.y, 8, circle16x16);

    this.getTargets().damage();
  }

  serialize() {
    return [this.x, this.y, this.targets?.serialize()] as const;
  }

  getTargets() {
    if (!this.targets) {
      this.targets = new TargetList();

      const range = 8 * 12;
      Level.instance.withNearbyEntities(
        (this.x + 4) * 6,
        (this.y + 8) * 6,
        range,
        (entity) => {
          if (isHurtableEntity(entity)) {
            const [x, y] = entity.getCenter();
            this.targets!.add(entity, 20, {
              power: 5,
              direction: this.direction,
            });
          }
        }
      );
    }

    return this.targets;
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
