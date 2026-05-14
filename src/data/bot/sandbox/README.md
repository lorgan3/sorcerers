# Bot path-follow sandbox

Code-defined scenarios for iterating on the character path follower
(`src/data/bot/path.ts`).

## Quick start

1. `yarn dev`
2. Open `http://localhost:3000/#/sandbox/flat` (or any scenario name from
   `registry.ts`).
3. Seed localStorage if you haven't: `tutorialDone: true`, then reload.
4. Toggle the debug overlay: `window.debug()` in the console.
5. Run all targets for the current scenario: `await window.debug.runAll()`.

## Debug API

- `window.debug.scenario()` — name, spawn, targets.
- `window.debug.character()` — current x/y/hp/name.
- `window.debug.graphSummary()` — node + edge counts.
- `window.debug.reset()` — teleport back to spawn, clear follower.
- `window.debug.followPath(toX, toY, opts?)` — drive the character to the
  closest node of `(toX, toY)`. Returns `FollowResult`.
- `window.debug.runAll(opts?)` — reset + followPath for every target. Returns
  `RunAllResult`.

## Bulk probing

```
node scripts/probe-pathfollow.mjs
```

Writes a markdown report under `scripts/.probe-output/`. Use the first run
as a baseline; diff later runs to spot regressions / wins.

## Adding a scenario

1. Add `scenarios/<name>.ts` exporting a `Scenario` (see `flat.ts`).
2. Register it in `registry.ts`.
3. Visit `/#/sandbox/<name>` to test.

Tile ids are defined in `src/data/wfc/tiles.ts`. Mirrored variants are
auto-generated with a `_m` suffix.

## HMR caveat

Vite HMR doesn't reload class definitions for live `Path` instances. After
editing `path.ts`, call `window.debug.reset()` before the next `followPath`
so a fresh `new Path(...)` picks up the new code.
