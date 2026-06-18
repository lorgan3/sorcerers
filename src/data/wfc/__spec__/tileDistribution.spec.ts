import { describe, expect, test } from "vitest";
import { solve } from "../wfc";
import { TILES, tierOf } from "../tiles";

export interface SampleConfig {
  width: number;
  height: number;
  density: number;
  seeds: number[];
}

export const DEFAULT_CONFIGS: SampleConfig[] = [
  { width: 16, height: 12, density: 0.3, seeds: [1, 2, 3, 4, 5] },
  { width: 16, height: 12, density: 0.5, seeds: [1, 2, 3, 4, 5] },
  { width: 16, height: 12, density: 0.7, seeds: [1, 2, 3, 4, 5] },
];

export function tileFrequencies(configs: SampleConfig[]): {
  counts: Record<string, number>;
  total: number;
  featureShareByTier: Record<string, Record<string, number>>;
} {
  const counts: Record<string, number> = {};
  let total = 0;
  const tierCounts: Record<string, Record<string, number>> = {};
  const tierTotals: Record<string, number> = {};

  for (const cfg of configs) {
    // Uniform target density per cell — a cleaner substrate for measuring
    // per-tier distribution than buildDefaultMask's banded profile.
    const mask = new Uint8Array(cfg.width * cfg.height).fill(
      Math.round(cfg.density * 255),
    );
    for (const seed of cfg.seeds) {
      const result = solve({
        width: cfg.width,
        height: cfg.height,
        tiles: TILES,
        continuityBonus: 1.5,
        preventBlockages: false,
        densityMask: mask,
        seed,
      });
      if (!result.success || !result.grid) continue;
      for (const row of result.grid) {
        for (const tile of row) {
          counts[tile.id] = (counts[tile.id] ?? 0) + 1;
          total++;
          if (tile.id === "solid" || tile.id === "empty") continue;
          const tier = tierOf(tile.density).toFixed(1);
          (tierCounts[tier] ??= {})[tile.id] =
            (tierCounts[tier]?.[tile.id] ?? 0) + 1;
          tierTotals[tier] = (tierTotals[tier] ?? 0) + 1;
        }
      }
    }
  }

  const featureShareByTier: Record<string, Record<string, number>> = {};
  for (const tier of Object.keys(tierCounts)) {
    featureShareByTier[tier] = {};
    for (const id of Object.keys(tierCounts[tier])) {
      featureShareByTier[tier][id] = tierCounts[tier][id] / tierTotals[tier];
    }
  }

  return { counts, total, featureShareByTier };
}

// Sampled once and shared across all assertions — the sweep is deterministic.
const SAMPLE = tileFrequencies(DEFAULT_CONFIGS);
const INTENTIONALLY_RARE = new Set(["island", "island_m", "floorNarrow", "emptyRampEntry", "emptyRampEntry_m"]);
const MAX_TIER_FEATURE_SHARE = 0.40;

describe("tileFrequencies harness", () => {
  test("produces a non-empty distribution including solid and empty", () => {
    expect(SAMPLE.total).toBeGreaterThan(0);
    expect(SAMPLE.counts["solid"]).toBeGreaterThan(0);
    expect(SAMPLE.counts["empty"]).toBeGreaterThan(0);
  });
});

describe("tile distribution invariants", () => {
  const freq = SAMPLE;

  test("every non-rare feature tile appears at least once", () => {
    const placed = new Set(Object.keys(freq.counts));
    const missing = TILES.filter(
      (t) =>
        t.id !== "solid" &&
        t.id !== "empty" &&
        !INTENTIONALLY_RARE.has(t.id) &&
        !placed.has(t.id),
    ).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  test("no feature tile dominates its tier beyond the threshold", () => {
    for (const tier of Object.keys(freq.featureShareByTier)) {
      for (const [id, share] of Object.entries(freq.featureShareByTier[tier])) {
        if (INTENTIONALLY_RARE.has(id)) continue;
        expect(
          share,
          `${id} is ${(share * 100).toFixed(0)}% of tier ${tier}`,
        ).toBeLessThanOrEqual(MAX_TIER_FEATURE_SHARE);
      }
    }
  });
});
