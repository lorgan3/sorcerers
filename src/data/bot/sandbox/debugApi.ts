import { getContextOrNull } from "../../context";
import { EdgeType } from "../edge";
import { Pathfinding } from "../pathfinding";
import { Path } from "../path";
import {
  getActiveScenario,
  getLastDamage,
  getOriginalMask,
  isSandboxPaused,
  setLastDamage,
  setSandboxPaused,
} from "./state";
import type {
  FollowResult,
  FollowReason,
  LastDamage,
  Pt,
  RunAllResult,
  TargetResult,
} from "./types";

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
    runAll?: (opts?: { timeoutMsPerTarget?: number }) => Promise<RunAllResult>;
    resume?: () => boolean;
    paused?: () => boolean;
    lastDamage?: () => LastDamage | null;
    path?: () => PathSnapshot | null;
  };
}

interface PathSnapshot {
  edges: Array<{
    type: EdgeType;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    cost: number;
  }>;
  currentIndex: number;
  remaining: number;
  done: boolean;
  stuck: boolean;
}

/**
 * Swap the live terrain collision masks for clones of the pristine snapshot.
 * The visual texture is left alone — sandbox cares about path correctness,
 * not aesthetics — so a previous run's crater may still be visible until the
 * next full route enter.
 */
function restoreOriginalMask(): boolean {
  const snap = getOriginalMask();
  const level = getContextOrNull()?.level;
  if (!snap || !level) return false;
  level.terrain.collisionMask = snap.clone();
  level.terrain.characterMask = snap.clone();
  return true;
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
    const startHp = character.hp;
    const NODE_ARRIVAL_RADIUS_SQ = 14 * 14;

    return new Promise<FollowResult>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        const [cx, cy] = character.body.precisePosition;

        let reason: FollowReason | null = null;
        if (character.hp <= 0) reason = "dead";
        else if (character.hp < startHp) reason = "damaged";
        else if (path.done) reason = "arrived";
        else if (path.stuck) reason = "stuck";
        else if (elapsed > timeoutMs) reason = "timeout";

        if (reason !== null) {
          // Damage events freeze the simulation so the user can inspect
          // the moment. window.debug.resume() or the next runAll() clears
          // the flag.
          if (reason === "dead" || reason === "damaged") {
            const snapshot = win.debug!.path!();
            logDamageSummary({ x: cx, y: cy }, character.hp, snapshot);
            setSandboxPaused(true);
          }
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

  win.debug.runAll = async (
    opts: { timeoutMsPerTarget?: number } = {},
  ): Promise<RunAllResult> => {
    const active = getActiveScenario();
    const emptySummary = {
      total: 0, arrived: 0, stuck: 0, dead: 0,
      damaged: 0, timeout: 0, noPath: 0,
    };
    if (!active) {
      return { scenario: "none", results: [], summary: emptySummary };
    }

    // Fresh slate: restore the terrain (in case a previous run carved a
    // crater) and clear any pause + last-damage record from a previous
    // damage event.
    restoreOriginalMask();
    setSandboxPaused(false);
    setLastDamage(null);

    const results: TargetResult[] = [];
    const summary = { ...emptySummary };

    for (const target of active.scenario.targets) {
      win.debug!.reset!();
      const followed = await win.debug!.followPath!(target.x, target.y, {
        timeoutMs: opts.timeoutMsPerTarget,
      });
      results.push({
        label: target.label,
        toX: target.x,
        toY: target.y,
        ...followed,
      });
      summary.total++;
      switch (followed.reason) {
        case "arrived": summary.arrived++; break;
        case "stuck": summary.stuck++; break;
        case "dead": summary.dead++; break;
        case "damaged": summary.damaged++; break;
        case "timeout": summary.timeout++; break;
        case "no-path": summary.noPath++; break;
      }

      // A damage event freezes the simulation — don't push the bot through
      // the rest of the targets while the user is inspecting the state.
      if (isSandboxPaused()) break;
    }

    return { scenario: active.scenario.name, results, summary };
  };

  win.debug.resume = (): boolean => {
    setSandboxPaused(false);
    return true;
  };

  win.debug.paused = (): boolean => isSandboxPaused();

  win.debug.lastDamage = (): LastDamage | null => getLastDamage();

  win.debug.path = (): PathSnapshot | null => {
    const controller = getContextOrNull()?.manager?.getActivePlayer()?.controller;
    if (!controller || !("getFollower" in controller)) return null;
    const path = (controller as { getFollower: () => Path | null }).getFollower();
    if (!path) return null;
    const remaining = path.remainingNodes;
    const currentIndex = path.edges.length - remaining;
    return {
      edges: path.edges.map((e) => ({
        type: e.type,
        fromX: e.from.x,
        fromY: e.from.y,
        toX: e.to.x,
        toY: e.to.y,
        cost: e.cost,
      })),
      currentIndex,
      remaining,
      done: path.done,
      stuck: path.stuck,
    };
  };
}

/**
 * Console-log a structured summary of the moment damage triggered. Called
 * by `followPath` right before it pauses the simulation.
 */
function logDamageSummary(
  endedAt: Pt,
  hpAfter: number,
  pathSnapshot: PathSnapshot | null,
): void {
  const damage = getLastDamage();
  const lines: string[] = ["[sandbox] damage event — simulation paused"];
  if (damage) {
    lines.push(
      `  impact pos:      (${damage.x.toFixed(1)}, ${damage.y.toFixed(1)})`,
      `  impact velocity: x=${damage.xVelocity.toFixed(2)}  y=${damage.yVelocity.toFixed(2)}  |v|=${damage.velocity.toFixed(2)}`,
      `  trigger:         ${damage.trigger}-axis crossed BOUNCE_TRIGGER ${damage.bounceThreshold}`,
      `  hp:              ${damage.hpBefore} → ${hpAfter}  (predicted -${damage.predictedDamage.toFixed(1)})`,
    );
  } else {
    lines.push(
      `  hp:              now ${hpAfter} (no LastDamage record — non-fall source?)`,
    );
  }
  lines.push(`  ended at:        (${endedAt.x.toFixed(1)}, ${endedAt.y.toFixed(1)})`);
  if (pathSnapshot) {
    const cur = pathSnapshot.edges[pathSnapshot.currentIndex];
    lines.push(
      `  path:            edge ${pathSnapshot.currentIndex}/${pathSnapshot.edges.length}, ${pathSnapshot.remaining} remaining`,
    );
    if (cur) {
      lines.push(
        `  current edge:    ${cur.type} (${cur.fromX},${cur.fromY}) → (${cur.toX},${cur.toY})`,
      );
    }
  }
  lines.push(
    `  inspect with window.debug.lastDamage() / .path() / .character()`,
    `  resume with window.debug.resume() or call window.debug.runAll() to start fresh`,
  );
  console.warn(lines.join("\n"));
}
