import { BBox } from "../../map/bbox";
import type { Config, Layer } from "../../map";
import { buildScenarioMask, resolveTiles } from "./builder";
import type { Loaded, Scenario } from "./types";

export async function loadScenario(scenario: Scenario): Promise<Loaded> {
  const tiles = resolveTiles(scenario.tiles);
  const { blob, ladders, width, height } = await buildScenarioMask(tiles);

  // Use the mask blob as the terrain image too — the sandbox doesn't need
  // textured terrain. The mask doubles as the visual (black silhouette on
  // transparent), and Map derives the collision mask from its alpha.
  const maskUrl = URL.createObjectURL(blob);

  const config: Config = {
    terrain: { data: maskUrl },
    layers: [] as Layer[],
    bbox: BBox.create(width, height).toJS(),
    parallax: { name: "", offset: 0 },
    scale: scenario.scale ?? 6,
    ladders: ladders.map((l) => ({
      left: l.x - l.width / 2,
      top: l.y,
      right: l.x + l.width / 2,
      bottom: l.y + l.height,
    })),
  };

  return { scenario, config };
}
