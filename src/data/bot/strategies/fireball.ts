import { Command, CommandType, Key } from "../../controller/controller";
import { FIREBALL } from "../../spells";
import { RangedStrategy } from "./rangedStrategy";

// PoweredArcaneCircle charges power at 0.1/tick starting from ~0.
// 50 ticks → power ≈ 5.0, near-max (5.49) — gives Fireball maximum range.
const HOLD_TICKS = 50;

// Aim slightly above the target's center to compensate for gravity drop during the
// projectile's flight. Tuned empirically — bots overshoot by a few pixels otherwise,
// but anything is better than aiming flat into the ground.
const AIM_LIFT_PIXELS = 60;

// Fireball is a short-to-medium range spell. Don't even attempt it past this distance
// (screen pixels) — the projectile arc would fall short.
const MAX_RANGE_SCREEN = 600;

// At point-blank range the arcing projectile flies past the target. Below this
// distance, prefer Melee.
const MIN_RANGE_SCREEN = 150;

export class Fireball extends RangedStrategy {
  public static spell = FIREBALL;

  protected maxRange(): number {
    return MAX_RANGE_SCREEN;
  }

  protected minRange(): number {
    return MIN_RANGE_SCREEN;
  }

  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const [centerX, centerY] = this.evaluation!.target.centerScreen;
    const mouseX = centerX;
    const mouseY = centerY - AIM_LIFT_PIXELS;

    // Phase 1: hold M1 with mouse pointed slightly above target.
    if (this.castFrames <= HOLD_TICKS) {
      const commands: Command[] = [];

      if (this.castFrames === 1) {
        commands.push({ type: CommandType.ResetKeys });
      }

      commands.push(
        {
          type: CommandType.MouseMove,
          x: mouseX,
          y: mouseY,
        },
        { type: CommandType.KeyDown, key: Key.M1 }
      );

      return commands;
    }

    // Phase 2: release M1 → fire at current power.
    if (this.castFrames === HOLD_TICKS + 1) {
      return [
        { type: CommandType.KeyUp, key: Key.M1 },
        {
          type: CommandType.MouseMove,
          x: mouseX,
          y: mouseY,
        },
      ];
    }

    // Phase 3: idle so the cursor observes M1 released.
    if (this.castFrames > HOLD_TICKS + 5) {
      return null;
    }

    return [];
  }
}
