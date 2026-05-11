export class InvalidStrategyError extends Error {
  private constructor(message: string) {
    super(`Invalid strategy because ${message}`);
  }

  static becausePathNotFound() {
    return new this("no path could be found");
  }

  static becausePathStuck() {
    return new this("we keep getting stuck");
  }

  static becauseNoReachableTarget() {
    return new InvalidStrategyError("No reachable target for this strategy");
  }
}
