<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Ticker, UPDATE_PRIORITY } from "pixi.js";
import { AssetsContainer } from "../../util/assets/assetsContainer";
import { Level } from "../../data/map/level";
import { buildZigzagMap, MAP_WIDTH } from "../../data/wfc/fixtures/zigzagMap";
import { setGameContext } from "../../data/context";
import { Player } from "../../data/network/player";
import { Character } from "../../data/entity/character";
import { Team } from "../../data/team";
import { COLORS } from "../../data/network/constants";
import { Element } from "../../data/spells/types";
import { Pathfinding } from "../../data/bot/pathfinding";
import { Path } from "../../data/bot/path";
import type { Graph } from "../../data/bot/graph";
import type { Node } from "../../data/bot/node";
import { setBotDebugEnabled } from "../../data/bot/debug";
import { KeyboardController } from "../../data/controller/keyboardController";
import {
  CommandType,
  type Command,
  type Controller,
  type Key,
  keyMap,
} from "../../data/controller/controller";

class TestController implements Controller {
  public readonly isBot = true;
  public pressedKeys = 0;
  private mouse: [number, number] = [0, 0];
  private eventHandlers = new Map<Key, Set<() => void>>();

  isKeyDown(key?: Key): boolean {
    if (key === undefined) {
      return !!this.pressedKeys;
    }
    return !!(this.pressedKeys & keyMap[key]);
  }

  getMouse(): [number, number] {
    return this.mouse;
  }

  getLocalMouse(): [number, number] {
    return this.mouse;
  }

  resetKeys() {
    this.pressedKeys = 0;
  }

  setKey(key: Key, state: boolean) {
    if (state) {
      this.pressedKeys |= keyMap[key];
    } else {
      this.pressedKeys &= ~keyMap[key];
    }
  }

  serialize(): [number, number, number] {
    return [this.pressedKeys, ...this.mouse];
  }

  deserialize(_buffer: [number, number, number]): void {
    throw new Error("TestController cannot be deserialized");
  }

  destroy() {}

  addKeyListener(key: Key, fn: () => void): () => void {
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key)!.add(fn);
    return () => this.removeKeyListener(key, fn);
  }

  removeKeyListener(key: Key, fn: () => void): void {
    this.eventHandlers.get(key)?.delete(fn);
  }

  setMouse(x: number, y: number) {
    this.mouse = [x, y];
  }
}

function applyCommands(commands: Command[], state: TestController) {
  const lastPressedKeys = state.pressedKeys;

  for (const command of commands) {
    switch (command.type) {
      case CommandType.ResetKeys:
        state.pressedKeys = 0;
        break;

      case CommandType.KeyDown:
        state.setKey(command.key, true);
        break;

      case CommandType.KeyUp:
        state.setKey(command.key, false);
        break;

      case CommandType.KeyPress:
        state.setKey(command.key, !(lastPressedKeys & keyMap[command.key]));
        break;

      case CommandType.MouseMove:
        state.setMouse(command.x, command.y);
        break;
    }
  }
}

// `#/test/pathfinding?mirror=1` runs the whole fixture mirrored left↔right —
// map, spawn and target — so the follower is exercised right-to-left as well as
// left-to-right. A directional bias in the path logic shows up as a different
// result (re-plans / stuck) than the unmirrored run, which arrives in 307/307.
const route = useRoute();
const mirror = !!route.query.mirror && route.query.mirror !== "0";

// Unmirrored spawn/target; mirrored variants reflect across MAP_WIDTH. The body
// is 6px wide, so its left edge mirrors to `MAP_WIDTH - x - 6`.
const SPAWN_X = mirror ? MAP_WIDTH - 40 - 6 : 40;
const TARGET_X = mirror ? MAP_WIDTH - 40 : 40;

const canvas = ref<HTMLDivElement | null>(null);
// Terminal-state marker rendered into the DOM so Playwright can `waitFor` the
// run to finish instead of relying on a fixed timeout. Stays empty until the
// run ends (arrived / stuck / no-path), then holds a single result line
// prefixed with `pathfinding-test:done`.
const status = ref("");

let level: Level | null = null;
let path: Path | null = null;
let simFrames = 0;
let totalEdges = 0;
let lastEdgeIndex = -1;
let testController: TestController | null = null;
let trackedCharacter: Character | null = null;
let cameraController: KeyboardController | null = null;
let frameCounter = 0;
let graphRef: Graph | null = null;
let targetNodeRef: Node | null = null;
let replanCount = 0;
const MAX_REPLANS = 3;

function createStubManager(getActive: () => Character | null) {
  return {
    getActiveCharacter: () => getActive(),
    getActivePlayer: () => getActive()?.player ?? null,
    getElementValue: (_e: Element) => 1,
    setTurnState: (_s: any) => {},
    dealFallDamage: (_x: number, _y: number, _c: any) => {},
    isTrusted: (_c: Character) => true,
  };
}

// Frame ticker uses a fixed dt and drives Character.control() at exactly
// every 3 frames so the run is deterministic — `ticker.deltaTime` varies
// frame-to-frame with browser scheduling, and a separate setInterval drifts
// against it, both of which produced non-reproducible bot trajectories.
const FIXED_DT = 1;
const CONTROL_EVERY_N_FRAMES = 3;
const frameTicker = (_ticker: Ticker) => {
  if (!level || !trackedCharacter || !testController) return;
  const dt = FIXED_DT;

  if (path) {
    simFrames += dt;
    const commands = path.getCommand(dt);
    applyCommands(commands, testController);

    const currentIndex = path.edges.length - path.remainingNodes;
    if (currentIndex !== lastEdgeIndex && currentIndex < path.edges.length) {
      const e = path.edges[currentIndex];
      const dx = (e.to.x - e.from.x).toFixed(0);
      const dy = (e.to.y - e.from.y).toFixed(0);
      console.log(
        `[pathfinding-test] edge ${currentIndex + 1}/${path.edges.length}: ${e.type} from (${e.from.x}, ${e.from.y}) to (${e.to.x}, ${e.to.y}) [Δ${dx}, ${dy}]`,
      );
      lastEdgeIndex = currentIndex;
    }

    if (path.done) {
      logResult(path, simFrames, trackedCharacter, totalEdges);
      path = null;
      testController.resetKeys();
    } else if (path.stuck) {
      const [, footY] = trackedCharacter.body.precisePosition;
      const fellOutOfMap = footY > 1000;
      if (!fellOutOfMap && replanCount < MAX_REPLANS && graphRef && targetNodeRef) {
        const [bx, by] = trackedCharacter.bodyFootCenter;
        const fromNode = graphRef.getClosestNode(bx, by);
        console.log(
          `[pathfinding-test] re-plan attempt at body foot (${bx.toFixed(1)}, ${by.toFixed(1)}); closest node (${fromNode.x}, ${fromNode.y})`,
        );
        const result = Pathfinding.findPath(fromNode, targetNodeRef);
        if (result.success && result.path.length > 0) {
          replanCount++;
          totalEdges += result.path.length;
          path = new Path(trackedCharacter, result.path);
          lastEdgeIndex = -1;
          testController.resetKeys();
          console.log(
            `[pathfinding-test] re-plan #${replanCount}: ${result.path.length} new edges from (${bx.toFixed(1)}, ${by.toFixed(1)})`,
          );
          return;
        }
        console.log(
          `[pathfinding-test] re-plan FAILED: success=${result.success} pathLen=${result.path?.length ?? "n/a"}`,
        );
      }
      logResult(path, simFrames, trackedCharacter, totalEdges);
      path = null;
      testController.resetKeys();
    }
  }

  trackedCharacter.controlContinuous(dt, testController);
  frameCounter++;
  if (frameCounter % CONTROL_EVERY_N_FRAMES === 0) {
    trackedCharacter.control(testController);
  }
  level.tick(dt);
};

function logResult(p: Path, frames: number, character: Character, edges: number) {
  const simSeconds = (frames / 60).toFixed(2);
  const completed = edges - p.remainingNodes;
  if (p.done) {
    console.log(
      `[pathfinding-test] arrived: ${frames.toFixed(0)} frames, ${simSeconds}s sim time, ${completed}/${edges} edges`,
    );
    status.value = `pathfinding-test:done arrived ${frames.toFixed(0)} frames ${completed}/${edges} edges`;
  } else {
    const [x, y] = character.body.precisePosition;
    console.log(
      `[pathfinding-test] stuck:   ${frames.toFixed(0)} frames, ${simSeconds}s sim time, ${completed}/${edges} edges, at (${x.toFixed(1)}, ${y.toFixed(1)})`,
    );
    status.value = `pathfinding-test:done stuck ${frames.toFixed(0)} frames ${completed}/${edges} edges at (${x.toFixed(1)}, ${y.toFixed(1)})`;
  }
}

watch(canvas, (el) => {
  if (!el) return;
  AssetsContainer.instance.onComplete(async () => {
    const map = await buildZigzagMap(mirror);
    level = new Level(el, map);

    let activeCharacter: Character | null = null;
    const stubManager = createStubManager(() => activeCharacter);
    setGameContext({ level, manager: stubManager as any, server: null });

    testController = new TestController();

    const player = new Player();
    player.connect("TestBot", Team.empty(), COLORS[0], testController);

    const character = new Character(player, SPAWN_X, 540, "TestBot");
    activeCharacter = character;
    trackedCharacter = character;
    player.addCharacter(character);

    cameraController = new KeyboardController(level.viewport);
    level.cameraTarget.connect(cameraController);
    level.cameraTarget.setTarget(character);

    frameCounter = 0;
    Ticker.shared.add(frameTicker, null, UPDATE_PRIORITY.LOW);

    setBotDebugEnabled(true);

    console.log("[pathfinding-test] character spawned at", character.body.precisePosition);

    const graph = level.buildGraph(character);

    const [spawnX, spawnY] = character.bodyFootCenter;
    const startNode = graph.getClosestNode(spawnX, spawnY);
    const targetNode = graph.getClosestNode(TARGET_X, 80);

    graphRef = graph;
    targetNodeRef = targetNode;
    replanCount = 0;

    const result = Pathfinding.findPath(startNode, targetNode);
    if (!result.success) {
      console.error("[pathfinding-test] no path found from", startNode, "to", targetNode);
      status.value = "pathfinding-test:done no-path";
      return;
    }

    path = new Path(character, result.path);
    totalEdges = result.path.length;
    console.log("[pathfinding-test] path built, edges:", result.path.length);

    simFrames = 0;
    lastEdgeIndex = -1;
  });
});

onUnmounted(() => {
  Ticker.shared.remove(frameTicker, null);
  cameraController?.destroy();
  level?.destroy();
  setGameContext(null);
});
</script>

<template>
  <div class="render-target" ref="canvas"></div>
  <div v-if="status" class="test-status" data-test-status>{{ status }}</div>
</template>

<style scoped>
.render-target {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.test-status {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 10;
  padding: 4px 8px;
  font-family: monospace;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
}
</style>
