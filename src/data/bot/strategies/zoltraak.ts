import { Command, CommandType, Key } from "../../controller/controller";
import { ZOLTRAAK } from "../../spells";
import { RangedStrategy } from "./rangedStrategy";

// Hold M1 for ~30 ticks so the cursor's charge indicator becomes visible
// (and the visual feedback matches a normal player cast).
const HOLD_TICKS = 30;

export class Zoltraak extends RangedStrategy {
  public static spell = ZOLTRAAK;

  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const targetCenter = this.evaluation!.target.position;
    const mouseX = targetCenter[0] * 6;
    const mouseY = targetCenter[1] * 6;

    // Phase 1: hold M1 with mouse pointed at target so the cursor aims correctly.
    if (this.castFrames <= HOLD_TICKS) {
      const commands: Command[] = [];

      // Reset existing keys (e.g. Inventory held during State.Selecting) before
      // we press M1 down. After this, every frame just keeps M1 held + mouse aimed.
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

    // Phase 2: release M1 → cursor fires.
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

    // Phase 3: cast issued; idle for a few frames so the cursor's tick observes M1 released.
    if (this.castFrames > HOLD_TICKS + 5) {
      return null;
    }

    return [];
  }
}
