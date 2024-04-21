import { CollisionMask } from "../collision/collisionMask";
import {
  smallSwordTip,
  smallSwordTipCanvas,
  swordTip,
  swordTipCanvas,
} from "../collision/precomputed/triangles";
import { Level } from "../map/level";
import { TargetList } from "./targetList";
import { DamageSource, DamageSourceType } from "./types";
import { isHurtableEntity } from "../entity/types";
import {
  circle16x16,
  circle16x16Canvas,
} from "../collision/precomputed/circles";

export enum Shape {
  SwordTip,
  SmallSword,
  Acid,
}

const r = 14;

const acidGradient = new OffscreenCanvas(r * 2, r * 2);
const ctx = acidGradient.getContext("2d")!;

const gradient = ctx.createRadialGradient(r, r, r / 2, r, r, r);
gradient.addColorStop(0, "#18962fe0");
gradient.addColorStop(1, "#18962f00");
ctx.arc(r, r, r, 0, 2 * Math.PI);
ctx.fillStyle = gradient;
ctx.fill();

const SHAPES: Record<
  Shape,
  {
    subtract: (
      this: FallDamage,
      ctx: OffscreenCanvasRenderingContext2D
    ) => void;
    draw?: (this: FallDamage, ctx: OffscreenCanvasRenderingContext2D) => void;
    mask: CollisionMask;
    xOffset: number;
    yOffset: number;
    range: number;
    power: number;
  }
> = {
  [Shape.SwordTip]: {
    subtract: function (ctx) {
      ctx.drawImage(swordTipCanvas, this.x, this.y);
    },
    mask: swordTip,
    xOffset: 6.5,
    yOffset: 10,
    range: 80,
    power: 0.5,
  },
  [Shape.SmallSword]: {
    subtract: function (ctx) {
      ctx.drawImage(smallSwordTipCanvas, this.x, this.y);
    },
    mask: smallSwordTip,
    xOffset: 0.5,
    yOffset: 10,
    range: 30,
    power: 0.1,
  },
  [Shape.Acid]: {
    subtract: function (ctx) {
      ctx.drawImage(circle16x16Canvas, this.x, this.y);
    },
    draw: function (ctx) {
      ctx.drawImage(acidGradient, this.x - r / 2, this.y - r / 2);
    },
    mask: circle16x16,
    xOffset: 8,
    yOffset: 8,
    range: 80,
    power: 0.1,
  },
};

export class FallDamage implements DamageSource {
  public readonly type = DamageSourceType.Falling;

  constructor(
    public readonly x: number,
    public readonly y: number,
    private shape: Shape,
    private power: number,
    public targets?: TargetList
  ) {}

  damage() {
    const data = SHAPES[this.shape];

    if (data.draw) {
      Level.instance.terrain.draw((ctx) => data.draw!.call(this, ctx));
    }

    Level.instance.terrain.subtract(this.x, this.y, data.mask, (ctx) =>
      data.subtract.call(this, ctx)
    );

    this.getTargets().damage(this);
  }

  getTargets() {
    if (this.targets) {
      return this.targets;
    }

    this.targets = new TargetList();

    const data = SHAPES[this.shape];
    const sx = (this.x + data.xOffset) * 6;
    const sy = (this.y + data.yOffset) * 6;
    Level.instance.withNearbyEntities(sx, sy, data.range, (entity) => {
      if (isHurtableEntity(entity)) {
        const [x] = entity.getCenter();
        const direction = sx < x ? -Math.PI / 3 : Math.PI + Math.PI / 3;
        this.targets!.add(entity, this.power, {
          power: data.power,
          direction,
        });
      }
    });

    return this.targets;
  }

  serialize() {
    return [this.x, this.y, this.shape, this.targets?.serialize()] as const;
  }

  static deserialize(data: ReturnType<FallDamage["serialize"]>) {
    return new FallDamage(
      data[0],
      data[1],
      data[2],
      0,
      TargetList.deserialize(data[3])
    );
  }
}
