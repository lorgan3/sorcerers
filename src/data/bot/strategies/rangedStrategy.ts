import { Strategy } from "./strategy";

export abstract class RangedStrategy extends Strategy {
  get destinationReached(): boolean {
    // Ranged strategies cast from the bot's current position — the path is empty
    // (or trivially short), so "destination" is reached as soon as we get here.
    return !this.follower || this.follower.done;
  }
}
