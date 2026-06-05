import { Command, CommandType, Key } from "../../controller/controller";
import { RangedStrategy } from "./rangedStrategy";

/**
 * Cast gesture for spells fired from a charged cursor (PoweredArcaneCircle / ArcaneCircle):
 * hold M1 aimed at aimPoint() for holdTicks (which charges power), then release to fire.
 * Hold duration is wall-clock-equivalent — accumulate dt, don't count calls.
 */
export abstract class ChargedHoldReleaseCast extends RangedStrategy {
  protected abstract readonly holdTicks: number;
  protected abstract aimPoint(): [number, number];

  private castTime = 0;
  private released = false;

  execute(dt: number): Command[] | null {
    const justStarted = this.castTime === 0;
    this.castTime += dt;

    const [mouseX, mouseY] = this.aimPoint();

    if (this.castTime < this.holdTicks) {
      const commands: Command[] = [];
      if (justStarted) commands.push({ type: CommandType.ResetKeys });
      commands.push(
        { type: CommandType.MouseMove, x: mouseX, y: mouseY },
        { type: CommandType.KeyDown, key: Key.M1 },
      );
      return commands;
    }

    if (!this.released) {
      this.released = true;
      return [
        { type: CommandType.KeyUp, key: Key.M1 },
        { type: CommandType.MouseMove, x: mouseX, y: mouseY },
      ];
    }

    if (this.castTime > this.holdTicks + 5) return null;
    return [];
  }
}
