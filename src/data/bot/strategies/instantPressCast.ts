import { Command, CommandType, Key } from "../../controller/controller";
import { RangedStrategy } from "./rangedStrategy";

/**
 * Cast gesture for spells that fire on a single M1 press (ApplyCursor / single-press
 * cursors): one tick of ResetKeys + aim so the character's look direction updates
 * (like Melee's two-step swing — a cast animation can block direction changes
 * afterwards), then aim + KeyPress M1, then idle until the cursor observes the press.
 */
export abstract class InstantPressCast extends RangedStrategy {
  protected abstract aimPoint(): [number, number];

  private step = 0;
  private castTime = 0;

  execute(dt: number): Command[] | null {
    this.castTime += dt;
    const [x, y] = this.aimPoint();

    if (this.step === 0) {
      this.step = 1;
      return [
        { type: CommandType.ResetKeys },
        { type: CommandType.MouseMove, x, y },
      ];
    }

    if (this.step === 1) {
      this.step = 2;
      return [
        { type: CommandType.MouseMove, x, y },
        { type: CommandType.KeyPress, key: Key.M1 },
      ];
    }

    if (this.castTime > 6) return null;
    return [];
  }
}
