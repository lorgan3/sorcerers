import { Command, CommandType, Key } from "../../controller/controller";
import { BAKURETSU } from "../../spells";
import { RangedStrategy } from "./rangedStrategy";

export class Bakuretsu extends RangedStrategy {
  public static spell = BAKURETSU;

  // Bakuretsu falls from the sky regardless of the bot's position — no LOS needed.
  protected requiresLineOfSight(): boolean {
    return false;
  }

  // Track how many frames we've spent in the cast sequence so we know when to finish.
  private castFrames = 0;

  execute(_dt: number): Command[] | null {
    this.castFrames++;

    const targetCenter = this.evaluation!.target.position;

    // Frame 1: set mouse to target's screen-x (cursor's x maps to projectile spawn x).
    // The y component is irrelevant for Bakuretsu (always falls from sky).
    // Single M1 keypress immediately fires the ArrowDown cursor.
    if (this.castFrames === 1) {
      return [
        { type: CommandType.ResetKeys },
        {
          type: CommandType.MouseMove,
          x: targetCenter[0] * 6,
          y: targetCenter[1] * 6,
        },
        { type: CommandType.KeyPress, key: Key.M1 },
      ];
    }

    // Cast already issued — release any held keys and finish.
    if (this.castFrames > 5) {
      return null;
    }

    return [];
  }
}
