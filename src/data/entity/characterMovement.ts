import { Controller, Key } from "../controller/controller";
import { BBox } from "../map/bbox";
import { Wings } from "./wings";
import { getLevel, getManager } from "../context";
import type { Character } from "./character";

const MAX_LADDER_MOUNT_SPEED = 1;
const JUMP_GRACE_TIME = 3;

export class CharacterMovement {
  private wasUp = false;
  public lastGroundedTime = 0;
  private wings?: Wings;

  constructor(private character: Character) {}

  ladderTest = (x: number, y: number): boolean => {
    if (!getManager().isTrusted(this.character)) {
      return false;
    }

    for (let ladder of getLevel().terrain.ladders) {
      if (
        x + 6 >= ladder.left &&
        x <= ladder.right &&
        y + 16 > ladder.top &&
        y < ladder.bottom
      ) {
        return true;
      }
    }

    return false;
  };

  control(controller: Controller): void {
    let foundLadder: BBox | null = null;
    if (
      this.character.body.grounded ||
      this.character.body.onLadder ||
      (this.character.body.yVelocity > 0 &&
        this.character.body.yVelocity < MAX_LADDER_MOUNT_SPEED)
    ) {
      const [x, y] = this.character.body.precisePosition;
      for (let ladder of getLevel().terrain.ladders) {
        if (
          x + 6 >= ladder.left &&
          x <= ladder.right &&
          y + 16 > ladder.top &&
          y < ladder.bottom &&
          ladder.top < (foundLadder?.top || Infinity)
        ) {
          foundLadder = ladder;
        }
      }
    }

    if (this.character.body.onLadder) {
      this.character.setSpellSource(null, false);
    }

    const isUp =
      controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W);
    if (!this.wings && foundLadder && isUp) {
      this.character.body.mountLadder();
    }

    if (this.character.body.onLadder) {
      if (!foundLadder) {
        if (getManager().isTrusted(this.character)) {
          this.character.body.unmountLadder();
        }
        return;
      }

      if (isUp) {
        if (
          this.character.body.precisePosition[1] + 8 >
          foundLadder.top
        ) {
          this.character.body.setLadderDirection(-1);
          this.character.animate("Climb");
        } else {
          if (!this.wasUp) {
            this.character.body.unmountLadder();
            this.character.body.jump();
            this.character.animate("Jump");
          }

          this.character.body.setLadderDirection(0);
        }
      } else if (
        controller.isKeyDown(Key.Down) ||
        controller.isKeyDown(Key.D)
      ) {
        this.character.body.setLadderDirection(1);
        this.character.animate("Climb");
      } else {
        this.character.body.setLadderDirection(0);
      }

      this.wasUp = isUp;
      return;
    }

    if (!isUp) {
      return;
    }

    if (
      this.character.time - this.lastGroundedTime < JUMP_GRACE_TIME &&
      !this.wings
    ) {
      if (this.character.body.jump()) {
        this.character.animate("Jump");
      }
    }

    if (this.wings) {
      this.wings.flap(this.character.time);
      this.character.animate("Float");

      if (this.wings.power <= 0) {
        this.removeWings();
      }
    }
  }

  controlContinuous(dt: number, controller: Controller): void {
    if (this.character.isAnimationBlocking()) {
      return;
    }

    this.character.updateLookDirection(controller);

    if (
      controller.isKeyDown(Key.Left) ||
      controller.isKeyDown(Key.A)
    ) {
      this.character.body.walk(-1);

      if (this.character.body.grounded) {
        this.character.animate("Walk");
        this.character.syncAnimationDirection();
      }
    }

    if (
      controller.isKeyDown(Key.Right) ||
      controller.isKeyDown(Key.D)
    ) {
      this.character.body.walk(1);

      if (this.character.body.grounded) {
        this.character.animate("Walk");
        this.character.syncAnimationDirection();
      }
    }
  }

  giveWings(): void {
    this.character.body.unmountLadder();
    this.wings = new Wings(this.character);
    this.character.addChildAt(this.wings, 0);
  }

  removeWings(): void {
    if (!this.wings) {
      return;
    }

    this.wings.stop();
    this.character.removeChild(this.wings);
    this.wings = undefined;
  }

  endTurn(): void {
    this.removeWings();
    this.character.body.setLadderDirection(0);
  }
}
