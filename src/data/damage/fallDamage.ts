import { Character } from "../character";
import { CollisionMask } from "../collision/collisionMask";
import { swordTip, swordTipCanvas } from "../collision/precomputed/triangles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";

export enum Shape {
  SwordTip,
}

const SHAPES: Record<
  Shape,
  {
    drawShape: (
      this: FallDamage,
      ctx: OffscreenCanvasRenderingContext2D
    ) => void;
    mask: CollisionMask;
    xOffset: number;
    yOffset: number;
    range: number;
    damage: number;
  }
> = {
  [Shape.SwordTip]: {
    drawShape: function (ctx) {
      ctx.drawImage(swordTipCanvas, this.x, this.y);
    },
    mask: swordTip,
    xOffset: 6.5,
    yOffset: 10,
    range: 64,
    damage: 10,
  },
};

export class FallDamage implements DamageSource {
  public readonly type = DamageSourceType.Falling;

  constructor(
    public readonly x: number,
    public readonly y: number,
    private shape: Shape,
    private targets?: TargetList
  ) {}

  damage() {
    const data = SHAPES[this.shape];

    Level.instance.terrain.subtract(
      this.x,
      this.y,
      (ctx) => data.drawShape.call(this, ctx),
      data.mask
    );

    if (!this.targets) {
      this.targets = new TargetList();

      const sx = (this.x + data.xOffset) * 6;
      const sy = (this.y + data.yOffset) * 6;
      Level.instance.withNearbyEntities(sx, sy, data.range, (entity) => {
        if (entity instanceof Character) {
          const [x] = entity.getCenter();
          const direction = sx < x ? Math.PI / 3 : Math.PI - Math.PI / 3;
          this.targets!.add(entity, data.damage, {
            power: 1,
            direction,
          });
        }

        // @TODO Damage to things that aren't characters?
      });
    }

    this.targets!.damage();
  }

  serialize() {
    return [this.x, this.y, this.shape, this.targets?.serialize()] as const;
  }

  static deserialize(data: ReturnType<FallDamage["serialize"]>) {
    return new FallDamage(
      data[0],
      data[1],
      data[2],
      TargetList.deserialize(data[3])
    );
  }
}
