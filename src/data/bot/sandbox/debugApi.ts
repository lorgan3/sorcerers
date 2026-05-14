import { getContextOrNull } from "../../context";
import { getActiveScenario } from "./state";
import type { Pt } from "./types";

interface DebugWindow extends Window {
  debug?: {
    (): boolean;
    scenario?: () => { name: string; spawn: Pt; targets: Array<Pt & { label: string }> } | null;
    character?: () => { x: number; y: number; hp: number; name: string } | null;
    graphSummary?: () => { nodes: number; edges: number } | null;
    reset?: () => boolean;
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
}
