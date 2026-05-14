import type { Config } from "../../map";

export interface Pt {
  x: number;
  y: number;
}

export interface Scenario {
  name: string;
  /** Rows of tile IDs from BASE_TILES; mirrored variants use the "_m" suffix. */
  tiles: string[][];
  /** Character spawn in game units (post-scale). */
  spawn: Pt & { name?: string };
  /** Destinations the follower should be able to reach from `spawn`. */
  targets: Array<Pt & { label: string }>;
  /** Map scale, defaults to 6. */
  scale?: number;
}

export interface Loaded {
  scenario: Scenario;
  config: Config;
}

export type FollowReason =
  | "arrived"
  | "stuck"
  | "dead"
  | "damaged"
  | "timeout"
  | "no-path";

export interface FollowResult {
  success: boolean;
  reason: FollowReason;
  startedAt: Pt;
  endedAt: Pt;
  distanceToTarget: number;
  durationMs: number;
  edgeCount: number;
  edgesConsumed: number;
}

export interface TargetResult extends FollowResult {
  label: string;
  toX: number;
  toY: number;
}

/**
 * Snapshot of the moment the bot triggered fall damage. Captured inside
 * `Server.dealFallDamage` before the body bounces, so velocity reflects
 * the impact, not the rebound.
 */
export interface LastDamage {
  /** Body top-left at impact. */
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  /** Body.velocity (magnitude) — drives ExplosiveDamage radius + power. */
  velocity: number;
  /** Which axis crossed BOUNCE_TRIGGER; "both" if both did. */
  trigger: "x" | "y" | "both";
  bounceThreshold: number;
  hpBefore: number;
  /** What `Server.dealFallDamage` will queue as the hp damage. */
  predictedDamage: number;
  /** `performance.now()` at impact. */
  timestamp: number;
}

export interface RunAllResult {
  scenario: string;
  results: TargetResult[];
  summary: {
    total: number;
    arrived: number;
    stuck: number;
    dead: number;
    damaged: number;
    timeout: number;
    noPath: number;
  };
}
