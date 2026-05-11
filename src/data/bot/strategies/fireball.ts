import { Command, CommandType, Key } from "../../controller/controller";
import { FIREBALL } from "../../spells";
import { RangedStrategy } from "./rangedStrategy";

// PoweredArcaneCircle charges power at 0.1/tick starting from ~0.
// 25 ticks → power ≈ 2.5, mid-range — works at typical engagement distances.
const HOLD_TICKS = 25;

// Aim slightly above the target's center to compensate for gravity drop during the
// projectile's flight. Tuned empirically — bots overshoot by a few pixels otherwise,
// but anything is better than aiming flat into the ground.
const AIM_LIFT_PIXELS = 30;

export class Fireball extends RangedStrategy {
  public static spell = FIREBALL;

  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const targetCenter = this.evaluation!.target.position;
    const mouseX = targetCenter[0] * 6;
    const mouseY = targetCenter[1] * 6 - AIM_LIFT_PIXELS;

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
