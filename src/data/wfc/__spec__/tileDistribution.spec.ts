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

describe("tileFrequencies harness", () => {
  test("produces a non-empty distribution including solid and empty", () => {
    const freq = tileFrequencies(DEFAULT_CONFIGS);
    expect(freq.total).toBeGreaterThan(0);
    expect(freq.counts["solid"]).toBeGreaterThan(0);
    expect(freq.counts["empty"]).toBeGreaterThan(0);
  });
});
