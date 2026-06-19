# Import WFC Tiles

Scan `src/data/wfc/tiles/` for new PNG images not yet registered in `src/data/wfc/tiles.ts`, validate them, determine their WfcTile properties, and add them to the TILES array after user approval.

## Process

### 1. Discover new tiles

- Glob `src/data/wfc/tiles/*.png` for all tile images
- Read `src/data/wfc/tiles.ts` and extract existing tile IDs from the TILES array
- Derive tile ID from filename: strip `.png` extension, strip `placeholder-` prefix if present (e.g. `cave-surface.png` → `cave-surface`)
- Filter to only images whose ID is not already in TILES
- If no new tiles found, report that and stop

### 2. Process each new tile (one at a time)

For each new tile image:

#### a. Analyze

Run the analysis script:
```bash
npx tsx scripts/analyzeTile.ts src/data/wfc/tiles/<filename>.png
```

This outputs JSON with: dimensions, validity, density, and per-edge socket suggestions. The reported `density` is the true opaque-pixel fraction — use it as-is (see the `density` field below). To re-derive or sanity-check densities for the whole tile set at once, run `npx tsx scripts/measureDensities.ts`.

#### b. Validate

Check the analysis output:
- **Dimensions** must be 80x80. If not, report the error and skip this tile.
- **Pixels** must be only black-opaque or fully transparent. If invalid pixels found, report the count and skip.

#### c. Visually inspect

Use the Read tool to view the tile image. This is essential for accurate socket determination — the analysis script provides suggestions but visual inspection is authoritative.

#### d. Determine properties

Build the proposed `WfcTile` entry with these fields:

| Field | How to determine |
|-------|-----------------|
| `id` | From filename (without `.png`) |
| `imagePath` | Vite import variable (added as import statement) |
| `sockets.top` | From analysis + visual: SOLID if edge fully filled, EMPTY if fully clear, SURFACE_LOW/HIGH/DOUBLE if mixed. LADDER only if explicitly a ladder tile. |
| `sockets.right` | Same logic |
| `sockets.bottom` | Same logic |
| `sockets.left` | Same logic |
| `weight` | Default 5. Higher (10-50) for tiles that should appear often, lower (0.1-2) for rare tiles. |
| `density` | The true opaque-pixel fraction from the analysis output — use it as-is, **no floor** (only a fully transparent tile is `0.0`). The picker derives a `{0.2, 0.4, 0.6, 0.8, 1.0}` tier from it via `tierOf`; do **not** round it yourself. |
| `avoidEdge` | Default: omit (allowed everywhere). Set if tile shouldn't be on specific map edges. |
| `avoidSockets` | Default: omit. Set if tile should avoid specific socket types in a direction. |
| `mandatoryNeighbors` | Default: omit. Set if a specific tile MUST be placed next to this one in a direction. |

**Socket detection guide (for vertical edges — left/right).** A surface socket marks where a *walkable floor* — the top of the solid region on that edge — sits:
- Walkable floor near the **bottom** of the tile (a thin ground strip, like `floor`) → `SURFACE_LOW`
- Walkable floor at the **middle** of the tile (solid fills roughly the bottom half, like `halfSolid`) → `SURFACE_HIGH`
- Two separate floor levels on the edge — a mid ledge **and** a low floor (like `doubleFloorSolid`) → `DOUBLE_SURFACE`
- Full edge solid → `SOLID`; full edge empty → `EMPTY`

There is **no socket for a floor near the top**: the highest a flat walkable surface can sit is mid-tile (`SURFACE_HIGH`), so a flat-topped walkable tile caps at ~0.55 density. Denser terrain comes from solid bulk and ramps, not flat tiles.

The analyzer's `solidCenter` suggestion is only a rough hint based on the solid's *center of mass* and can disagree with the true surface height (e.g. a near-vertical ramp whose surface is at mid-height but whose mass sits low). Decide the socket by **where a character would stand**, confirmed visually (step c).

**For horizontal edges (top/bottom):** only `SOLID`, `EMPTY`, or `LADDER` — never a surface socket.

**LADDER sockets** cannot be auto-detected — they are semantic. Only assign LADDER if the tile name or visual clearly indicates a ladder opening. LADDER can only appear on top or bottom sockets, never left or right.

#### e. Present to user

Show the tile image (use Read tool so user sees it) and present the proposed values in a clear format:

```
Tile: <id>
  sockets: top=EMPTY, right=SURFACE_LOW, bottom=SOLID, left=SURFACE_LOW
  weight: 5
  density: 0.45
  avoidEdge: (none)
  avoidSockets: (none)
  mandatoryNeighbors: (none)
```

Ask: **"Which values need adjustment?"**

Wait for user response. Apply any requested changes.

#### f. Add to tiles.ts

Once the user approves (or says the values are fine):

1. Add an import statement before the TILES array:
```typescript
import <camelCaseId> from "./tiles/<filename>.png";
```

2. Add the tile entry to the TILES array:
```typescript
  {
    id: "<id>",
    imagePath: <camelCaseId>,
    sockets: {
      top: Socket.<TOP>,
      right: Socket.<RIGHT>,
      bottom: Socket.<BOTTOM>,
      left: Socket.<LEFT>,
    },
    weight: <weight>,
    density: <density>,
  },
```

Only include optional fields (`avoidEdge`, `avoidSockets`, `mandatoryNeighbors`) if they have values.

### 3. After all tiles processed

- Run `yarn check-types` to verify no type errors
- Report how many tiles were added

## Socket Types Reference

| Socket | Meaning |
|--------|---------|
| SOLID | Entire edge is filled (black) |
| EMPTY | Entire edge is clear (transparent) |
| SURFACE_LOW | Walkable floor near the bottom of the tile |
| SURFACE_HIGH | Walkable floor at the middle of the tile (highest a flat surface can sit) |
| DOUBLE_SURFACE | Two floor levels on the edge — a mid ledge and a low floor |
| LADDER | Ladder opening — only on top/bottom sockets, never on edges of the map |
