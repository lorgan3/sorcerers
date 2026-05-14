import { CollisionMask } from "../../collision/collisionMask";
import { BBox } from "../../map/bbox";
import { Map as GameMap } from "../../map";
import { Terrain } from "../../map/terrain";
import { Graph } from "../graph";
import { buildScenarioMask, resolveTiles } from "./builder";
import type { Scenario } from "./types";

/**
 * Builds a `Terrain` + `Graph` directly from a `Scenario`, bypassing the
 * Level/Manager stack. Useful for Vitest assertions on graph + A* output
 * without running physics or the game loop. Note: requires the test
 * environment to have `createImageBitmap` available, which jsdom does
 * not — for now this is a smoke test that only confirms the helper
 * survives import + invocation when assets are reachable.
 */
export async function buildSandboxGraph(scenario: Scenario): Promise<Graph> {
  const tiles = resolveTiles(scenario.tiles);
  const { blob, ladders, width, height } = await buildScenarioMask(tiles);

  const url = URL.createObjectURL(blob);
  const map = await GameMap.fromConfig({
    terrain: { data: url },
    layers: [],
    bbox: BBox.create(width, height).toJS(),
    parallax: { name: "", offset: 0 },
    scale: scenario.scale ?? 6,
    ladders: ladders.map((l) => ({
      left: l.x - l.width / 2,
      top: l.y,
      right: l.x + l.width / 2,
      bottom: l.y + l.height,
    })),
  });

  // Terrain requires a Container, which requires a renderer. For tests that
  // don't need rendering we build a minimal Terrain shim that exposes
  // characterMask + killbox.level + ladders — enough for Graph.build().
  const terrain = {
    characterMask: map.collisionMask.clone() as CollisionMask,
    killbox: { level: map.height + 1 },
    ladders: map.ladders,
  } as unknown as Terrain;

  const graph = new Graph(terrain);
  graph.build();
  return graph;
}
