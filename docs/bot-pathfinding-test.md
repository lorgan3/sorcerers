# Bot pathfinding test route

A dev-only harness for iterating on the bot's node follower (`src/data/bot/path.ts`) without the friction of setting up a full game.

## Where it lives

- Route: `/#/test/pathfinding` (registered in `src/main.ts` behind `import.meta.env.DEV`, so the chunk is dropped from production builds)
- Page: `src/components/pages/PathfindingTest.vue`
- Map fixture: `src/data/wfc/fixtures/zigzagMap.ts`

## What it does

On page load:

1. Builds a deterministic 12×8 WFC tile grid — a zigzag with 4 walkable floor rows (rows 1/3/5/7) joined by three ladder runs that alternate which end of each leg they sit at. Each leg mixes ramps, `floorBox` hops and `floorHole` gaps so the follower hits walk/jump/climb/fall edges. See `zigzagMap.ts` for the literal grid.
2. Spawns one `Character` at a fixed body position `(40, 540)` — bottom-left corner of the bottom floor.
3. Sets a fixed target node at `(40, 80)` — top-left corner of the top floor.
4. Builds the navigation graph (`Level.buildGraph`), runs `Pathfinding.findPath` between spawn and target, and wraps the resulting edges in a `Path`.
5. Wires a `TestController` to the player so the `Path` follower's keypresses drive the body.
6. Enables the bot debug overlay (`setBotDebugEnabled(true)`) so graph nodes, planned path, and currently-followed edge are visible.
7. Ticks the simulation on a **single Pixi ticker** (`Ticker.shared`) with a fixed `dt` of `1.0` per frame (`FIXED_DT`), so the run doesn't depend on browser frame scheduling. Each frame it:
   - calls `Path.getCommand(dt)` and applies the returned commands to the test controller,
   - calls `controlContinuous` for walk velocity and `Level.tick(dt)` so physics + camera advance,
   - and calls `Character.control` **once every 3rd frame** (`CONTROL_EVERY_N_FRAMES = 3`) — i.e. ~20 Hz at 60 fps, the same cadence as `Server.fixedTick` in production. (An earlier version drove `control` from a separate 20 Hz `setInterval`, but it drifted against the ticker and produced non-reproducible trajectories; folding it into the ticker fixed that.) This cadence matters: `control` handles `body.jump()`, `mountLadder()`, and the ladder edge-dismount rule; running it every frame would reset `yVelocity = 0` each tick and prevent ladder climbing.
8. **Re-plans on stuck.** When the follower makes no edge progress for ~2 s (`Path.stuck`), the harness finds the closest graph node to the body's current foot position and re-runs `findPath` to the same target, up to `MAX_REPLANS` (3) times. Each attempt logs `re-plan attempt` then either `re-plan #N` (new path found) or `re-plan FAILED` (no path from the current node). The run only ends — with the `stuck` summary — when a re-plan fails, the body falls out of the map, or the cap is reached.

Because every input is deterministic — fixed spawn, fixed target, fixed map, no RNG in the follower, and a deterministic collision mask (the blur in `wfc/postProcess.ts` is computed in JS, not via the engine-specific `ctx.filter`) — successive page loads produce the same result (same tick count to arrive, same stuck position if it fails), and the result is now identical across browsers too.

## Driving it

```
yarn dev
# open http://localhost:3000/#/test/pathfinding
```

The character spawns and immediately starts walking the planned path. The camera follows. Scroll wheel zooms. No keyboard input needed (and ignored — the test controller is the only one driving the bot).

Append `?mirror=1` (`#/test/pathfinding?mirror=1`) to run the whole fixture mirrored left↔right — map, spawn, and target are all reflected across `MAP_WIDTH`, so the follower is exercised right-to-left as well. A directional bias in the path logic shows up as a different result (re-plans / stuck) than the unmirrored run.

### Running a real map

`?map=<Name>` swaps the zigzag fixture for a bundled map (the keys in `defaultMaps`, `src/util/assets/constants.ts`): `Playground`, `Castle`, `Stadium`, `Mario_World`, `Office`. The map is loaded straight from its `.png` (`Map.fromBlob`), so its baked-in collision mask is used — no browser-dependent mask blur.

`?pair=N` (default `0`) picks the spawn/target from the map's own spawn locations (`Terrain.getSpawnLocations`), sorted by x: pair `N` runs the Nth-leftmost spawn to the Nth-rightmost, i.e. a left↔right crossing. Successive `N` probe different crossings.

```
# open http://localhost:3000/#/test/pathfinding?map=Stadium&pair=1
```

Real maps run without a Server, so the engine's killbox damage never fires — instead the harness detects a fall into the killbox itself and ends the run `died` (see below). Some pairs sit on disconnected platforms; those end `no-path` and are expected (the spawn picker doesn't guarantee connectivity). Note the route uses hash-based routing, so a `?map=`/`?pair=` change needs a full reload (`location.reload()`), not just a hash edit, to re-run.

## Reading the console logs

Open devtools → console. You'll see lines like:

```
[pathfinding-test] character spawned at [40, 540]
[pathfinding-test] path built, edges: 310
[pathfinding-test] edge 1/310: walk from (48, 626) to (60, 626) [Δ12, 0]
[pathfinding-test] edge 2/310: walk from (60, 626) to (72, 626) [Δ12, 0]
…
[pathfinding-test] re-plan #1: 284 new edges from (362.8, 597.0)
…
[pathfinding-test] stuck 1310 frames 342/587 edges 3 re-plans at (792.0, 612.0), 21.83s sim time
```

(Numbers are illustrative of a current run — the follower doesn't complete this map, so it re-plans and ends `stuck`; an `arrived` run ends with that line instead. The `<completed>/<total>` total grows past the initial 310 because each re-plan appends its edges.)

**Format of the per-edge line:**

```
edge <N>/<total>: <type> from (<fromX>, <fromY>) to (<toX>, <toY>) [Δ<dx>, <dy>]
```

- `<N>/<total>` — current edge index out of total path length.
- `<type>` — `walk`, `climb`, `jump`, or `fall` (see `src/data/bot/edge.ts:EdgeType`).
- `(fromX, fromY)` → `(toX, toY)` — the graph node positions in mask-space pixels. Graph nodes sit 8 pixels above the floor surface they belong to.
- `[Δdx, dy]` — to-from delta, signed. Useful for spotting non-trivial edges at a glance:
  - `walk` with `Δy = 0` — flat traversal.
  - `walk` with `Δy < -3` — step-up (handled by the Walk-with-rise branch in `path.ts`; >3 pixels exceeds the body's auto-step).
  - `climb` — always vertical, `Δx = 0`.
  - `jump` with `Δx ≠ 0` — horizontal jump; the Path follower needs run-up and launches at the from-edge.

A new edge logs **only when the path advances** (`Path.remainingNodes` decreases). If you see no progress over many seconds, the bot is stuck on the current edge — the next log will be a `re-plan` attempt (see below) or, if re-planning is done, the stuck/arrived summary.

**Re-plan lines** (emitted when the follower stalls, before the run is declared over):

- `re-plan attempt at body foot (x, y); closest node (nx, ny)` — the follower stalled; the harness is re-planning from `(nx, ny)`.
- `re-plan #N: <k> new edges from (x, y)` — a fresh path was found; following resumes.
- `re-plan FAILED: success=false …` — no path from the current node; the run ends with a `stuck` summary next.

**Result line** (terminal — only after re-planning is exhausted). All carry `<r> re-plans`: `0 re-plans` is a clean run; a higher count means the follower stalled and recovered that many times, so a stalling run is no longer hidden behind a final `arrived`.

- `arrived <frames> frames <completed>/<total> edges <r> re-plans` — full completion. Confirmed only after the bot stays clear of the killbox for `SETTLE_FRAMES` (90) past the last edge.
- `stuck <frames> frames <completed>/<total> edges <r> re-plans at (x, y)` — `Path.bustedTimer` (in `path.ts`) ran out (~2 sim seconds of no edge advance) and re-planning couldn't recover. `(x, y)` is the body's precise position when the run ended.
- `died <frames> frames <completed>/<total> edges <r> re-plans at (x, y)` — the body fell into the killbox (during the path or the post-arrival settle window). Real maps only — the zigzag fixture has no killbox.

`<completed>/<total>` total grows past the initial path length because each re-plan appends its edges. The console also appends `, <s>s sim time` (sim time = `frames / 60`; one frame = one Pixi `deltaTime` of 1.0 at 60 fps).

The terminal result is also written to the DOM (a `[data-test-status]` element, text prefixed with `pathfinding-test:done`) so automation can wait on it without a timeout — see below.

## Iterating on the node follower

Typical loop:

1. Read the latest log run (especially the last few `edge` lines before `stuck`). The edge type tells you which branch of `Path.getCommand` was active.
2. Open `src/data/bot/path.ts` and change behavior for that branch.
3. Reload the page. The deterministic setup means tick counts are directly comparable — if your change made the bot arrive at the same edge in fewer frames, that's a real improvement, not noise.
4. If the bot starts arriving at the destination, compare total frames across runs.

Things to keep in mind while iterating:

- **`Path.getCommand` is dt-scaled in Pixi frames, not ms.** A `dt` of ~1.0 per call is normal at 60 fps. `BUSTED_TIMER = 120` means ~2 seconds before "stuck".
- **`Character.control` runs every 3rd frame (~20 Hz at 60 fps), not every frame.** Anything you change in `characterMovement.ts` (jump, ladder mount, edge dismount) sees the same cadence as the production server, so test behavior should match the real game.
- **The bot debug overlay** (toggled on automatically) draws graph nodes (numbered), the planned path (highlighted edge), and edges color-coded by type. Useful for sanity-checking against the logs.

## Known sharp edges

- The graph creates Jump edges between LadderTop nodes and adjacent platforms. Ladder *middle* nodes don't get Jump edges (recent fix in `graph.ts`) — the bot has to climb all the way to LadderTop before exiting sideways.
- The Path inserts a "pre-roll" detour (in `Pathfinding.reconstructPath`) for Jump edges that reverse direction, so the bot walks backward to build run-up. This shows up as extra Walk edges in the log around Jump edges.
- A `Path.WALKING_NEXT_DISTANCE` of 12 (squared = `sqrt(12) ≈ 3.5` pixels) means edge advance triggers when the body center comes within ~3.5 pixels of the destination — generous enough that the bot doesn't need to land exactly on the node.

## Automating with Playwright MCP

The test page is a good candidate for fully-automated regression: deterministic setup, a single terminal result (in both the console and a `[data-test-status]` DOM marker), no UI interaction needed.

When Playwright MCP is available, a single recipe drives the whole loop (verified with the current MCP plugin):

1. **Start the dev server** — `yarn dev` (background; serves `localhost:3000`). Skip if already running.
2. **Navigate** — `browser_navigate("http://localhost:3000/#/test/pathfinding")` (append `?map=…&pair=…` for a real map). The route is hash-based, so when only the query changes between runs follow the navigate with `browser_evaluate(() => location.reload())` to force a fresh run.
3. **Wait for the run to finish** — `browser_wait_for({ text: "pathfinding-test:done" })`. The harness writes the terminal result into a `[data-test-status]` DOM element prefixed with `pathfinding-test:done` (`… arrived …`, `… stuck …`, `… died …`, or `… no-path`), so `wait_for` resolves the moment the run ends — no fixed sleep, regardless of how long re-planning takes or how big the map grows. (The zigzag fixture runs ~108 s of sim time, so it can exceed a single 30 s `wait_for`; call `wait_for` again.)
4. **Read the result** — either read the DOM element directly (`browser_evaluate(() => document.querySelector("[data-test-status]").textContent)`), or pull the full per-edge trace from `browser_console_messages({ level: "info" })` and filter for `[pathfinding-test]`.
5. **Parse the result line** — from the DOM marker: `/pathfinding-test:done (arrived|stuck|died|no-path)(?: (\d+) frames (\d+)\/(\d+) edges (\d+) re-plans(?: at \(([\d.]+), ([\d.]+)\))?)?/`. Always inspect the `re-plans` count: a run can end `arrived` yet have stalled and recovered several times.

A regression check looks like: run the recipe, compare the tick count to a baseline. If the bot now arrives in fewer frames, the change improved the follower. If it stuck where it didn't before, the change regressed.

For an A/B comparison: stash a baseline tick count in the repo (e.g., `docs/bot-pathfinding-baseline.txt`), and have the recipe diff against it. Anything within ±2 frames is noise from non-deterministic Pixi timing; larger swings are real.

Playwright MCP isn't currently set up to run from CI — this is an interactive workflow for now.
