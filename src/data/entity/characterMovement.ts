import { Controller, Key } from "../controller/controller";
import { BBox } from "../map/bbox";
import { Wings } from "./wings";
import { getLevel, getManager } from "../context";
import type { Character } from "./character";

const MAX_LADDER_MOUNT_SPEED = 1.5;
const JUMP_GRACE_TIME = 3;
const LADDER_DISMOUNT_BOOST = 0.6;

export class CharacterMovement {
  private wasUp = false;
  private wasLeft = false;
  private wasRight = false;
  public lastGroundedTime = 0;
  private wings?: Wings;
  private lastFoundLadder: BBox | null = null;

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

    const isUp = controller.isKeyDown(Key.Up) || controller.isKeyDown(Key.W);
    if (!this.wings && foundLadder && isUp) {
      this.character.body.mountLadder();
    }

    const leftHeld =
      controller.isKeyDown(Key.Left) || controller.isKeyDown(Key.A);
    const rightHeld =
      controller.isKeyDown(Key.Right) || controller.isKeyDown(Key.D);

    if (foundLadder) this.lastFoundLadder = foundLadder;

    if (this.character.body.onLadder) {
      const ladder = foundLadder ?? this.lastFoundLadder;
      if (!ladder) {
        if (getManager().isTrusted(this.character)) {
          this.character.body.unmountLadder();
        }
        this.wasLeft = leftHeld;
        this.wasRight = rightHeld;
        return;
      }

      const [px, py] = this.character.body.precisePosition;
      const atLeftEdge = px <= ladder.left - 6 + 0.5;
      const atRightEdge = px >= ladder.right - 0.5;

      if (
        leftHeld &&
        !this.wasLeft &&
        atLeftEdge &&
        getManager().isTrusted(this.character)
      ) {
        this.character.move(ladder.left - 6 - 1, py);
        this.character.body.unmountLadder();
        this.character.body.addVelocity(-LADDER_DISMOUNT_BOOST, 0);
        this.wasUp = isUp;
        this.wasLeft = leftHeld;
        this.wasRight = rightHeld;
        return;
      }
      if (
        rightHeld &&
        !this.wasRight &&
        atRightEdge &&
        getManager().isTrusted(this.character)
      ) {
        this.character.move(ladder.right + 1, py);
        this.character.body.unmountLadder();
        this.character.body.addVelocity(LADDER_DISMOUNT_BOOST, 0);
        this.wasUp = isUp;
        this.wasLeft = leftHeld;
        this.wasRight = rightHeld;
        return;
      }

      if (px > ladder.right) {
        this.character.move(ladder.right, py);
        this.character.body.xVelocity = 0;
      } else if (px < ladder.left - 6) {
        this.character.move(ladder.left - 6, py);
        this.character.body.xVelocity = 0;
      }

      if (isUp) {
        if (this.character.body.precisePosition[1] + 8 > ladder.top) {
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
        this.character.animate("ClimbIdle");
      }

      this.wasUp = isUp;
      this.wasLeft = leftHeld;
      this.wasRight = rightHeld;
      return;
    }

    this.wasLeft = leftHeld;
    this.wasRight = rightHeld;

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

    const ladder = this.character.body.onLadder ? this.lastFoundLadder : null;
    const [px] = this.character.body.precisePosition;
    const atLeftEdge = !!ladder && px <= ladder.left - 6;
    const atRightEdge = !!ladder && px >= ladder.right;

    if (
      (controller.isKeyDown(Key.Left) || controller.isKeyDown(Key.A)) &&
      !atLeftEdge
    ) {
      this.character.body.walk(-1);
      this.character.player.stats.distanceWalked++;

      if (this.character.body.grounded) {
        this.character.animate("Walk");
        this.character.syncAnimationDirection();
      }
    }

    if (
      (controller.isKeyDown(Key.Right) || controller.isKeyDown(Key.D)) &&
      !atRightEdge
    ) {
      this.character.body.walk(1);
      this.character.player.stats.distanceWalked++;

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
