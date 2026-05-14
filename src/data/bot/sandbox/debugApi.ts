import { getContextOrNull } from "../../context";
import { Pathfinding } from "../pathfinding";
import { Path } from "../path";
import { getActiveScenario } from "./state";
import type { FollowResult, FollowReason, Pt } from "./types";

interface DebugWindow extends Window {
  debug?: {
    (): boolean;
    scenario?: () => { name: string; spawn: Pt; targets: Array<Pt & { label: string }> } | null;
    character?: () => { x: number; y: number; hp: number; name: string } | null;
    graphSummary?: () => { nodes: number; edges: number } | null;
    reset?: () => boolean;
    followPath?: (
      toX: number,
      toY: number,
      opts?: { timeoutMs?: number }
    ) => Promise<FollowResult>;
  };
}

/**
 * Attaches the sandbox debug API onto the existing `window.debug` toggle
 * function. Idempotent — safe to call on every Level construction.
 */
export function installDebugApi(): void {
  if (typeof window === "undefined") return;
  const win = window as DebugWindow;
  if (!win.debug) return; // bot/debug.ts not yet evaluated

  win.debug.scenario = () => {
    const active = getActiveScenario();
    if (!active) return null;
    return {
      name: active.scenario.name,
      spawn: { x: active.scenario.spawn.x, y: active.scenario.spawn.y },
      targets: active.scenario.targets.map((t) => ({
        x: t.x,
        y: t.y,
        label: t.label,
      })),
    };
  };

  win.debug.character = () => {
    const manager = getContextOrNull()?.manager;
    const character = manager?.getActiveCharacter();
    if (!character) return null;
    const [x, y] = character.body.precisePosition;
    return {
      x,
      y,
      hp: character.hp,
      name: character.characterName,
    };
  };

  win.debug.graphSummary = () => {
    const graph = getContextOrNull()?.level?.getGraph();
    if (!graph) return null;
    const nodes = graph.getNodes();
    let edges = 0;
    for (const n of nodes) edges += n.edges.length;
    return { nodes: nodes.length, edges };
  };

  win.debug.reset = (): boolean => {
    const ctx = getContextOrNull();
    const level = ctx?.level;
    const manager = ctx?.manager;
    const active = getActiveScenario();
    if (!level || !manager || !active) return false;

    const character = manager.getActiveCharacter();
    if (!character) return false;

    const controller = manager.getActivePlayer()?.controller;
    if (controller && "clearFollower" in controller) {
      (controller as { clearFollower: () => void }).clearFollower();
    }

    const [oldX, oldY] = character.body.position;
    level.terrain.characterMask.subtract(character.body.mask, oldX, oldY);

    character.body.move(active.scenario.spawn.x, active.scenario.spawn.y);
    character.body.xVelocity = 0;
    character.body.yVelocity = 0;
    character.hp = 100;

    const [newX, newY] = character.body.position;
    level.terrain.characterMask.add(character.body.mask, newX, newY);

    return true;
  };

  win.debug.followPath = async (
    toX: number,
    toY: number,
    opts: { timeoutMs?: number } = {},
  ): Promise<FollowResult> => {
    const timeoutMs = opts.timeoutMs ?? 15000;
    const ctx = getContextOrNull();
    const level = ctx?.level;
    const manager = ctx?.manager;

    const character = manager?.getActiveCharacter();
    const controller = manager?.getActivePlayer()?.controller;
    const graph = level?.getGraph();

    const startedAt: Pt = character
      ? {
          x: character.body.precisePosition[0],
          y: character.body.precisePosition[1],
        }
      : { x: 0, y: 0 };

    const fail = (reason: FollowReason): FollowResult => ({
      success: false,
      reason,
      startedAt,
      endedAt: startedAt,
      distanceToTarget: Math.hypot(toX - startedAt.x, toY - startedAt.y),
      durationMs: 0,
      edgeCount: 0,
      edgesConsumed: 0,
    });

    if (!level || !manager || !character || !graph) return fail("no-path");
    if (!controller || !("installFollower" in controller)) return fail("no-path");

    const [px, py] = character.body.precisePosition;
    const from = graph.getClosestNode(px + 3, py + 8);
    const to = graph.getClosestNode(toX, toY);
    if (!from || !to) return fail("no-path");

    const result = Pathfinding.findPath(from, to);
    if (!result.success) return fail("no-path");

    const path = new Path(character, result.path);
    (controller as { installFollower: (p: Path) => void }).installFollower(path);

    const start = performance.now();
    const NODE_ARRIVAL_RADIUS_SQ = 14 * 14;

    return new Promise<FollowResult>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        const [cx, cy] = character.body.precisePosition;

        let reason: FollowReason | null = null;
        if (character.hp <= 0) reason = "dead";
        else if (path.done) reason = "arrived";
        else if (path.stuck) reason = "stuck";
        else if (elapsed > timeoutMs) reason = "timeout";

        if (reason !== null) {
          const distSq = (to.x - cx) ** 2 + (to.y - cy) ** 2;
          const arrivedAtNode = distSq <= NODE_ARRIVAL_RADIUS_SQ;
          const success = reason === "arrived" && arrivedAtNode;
          resolve({
            success,
            reason: reason === "arrived" && !arrivedAtNode ? "stuck" : reason,
            startedAt,
            endedAt: { x: cx, y: cy },
            distanceToTarget: Math.hypot(toX - cx, toY - cy),
            durationMs: elapsed,
            edgeCount: path.edges.length,
            edgesConsumed: path.edges.length - path.remainingNodes,
          });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
}
