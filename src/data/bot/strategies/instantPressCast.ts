import { Command, CommandType, Key } from "../../controller/controller";
import { RangedStrategy } from "./rangedStrategy";

/**
 * Cast gesture for spells that fire on a single M1 press (ApplyCursor / single-press
 * cursors): one tick of ResetKeys + aim + KeyPress M1, then idle until the cursor
 * observes the press.
 */
export abstract class InstantPressCast extends RangedStrategy {
  protected abstract aimPoint(): [number, number];

  private pressed = false;
  private castTime = 0;

  execute(dt: number): Command[] | null {
    this.castTime += dt;

    if (!this.pressed) {
      this.pressed = true;
      const [x, y] = this.aimPoint();
      return [
        { type: CommandType.ResetKeys },
        { type: CommandType.MouseMove, x, y },
        { type: CommandType.KeyPress, key: Key.M1 },
      ];
    }

    if (this.castTime > 5) return null;
    return [];
  }
}
