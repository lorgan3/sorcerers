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

This outputs JSON with: dimensions, validity, density, and per-edge socket suggestions.

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
| `sockets.top` | SOLID if edge fully filled, EMPTY if fully clear, LADDER only if explicitly a ladder opening. **Never a surface socket** — top/bottom are SOLID/EMPTY/LADDER only. |
| `sockets.right` | From analysis + visual: SOLID, EMPTY, or a surface socket (SURFACE_LOW / SURFACE_HALF_LOW / SURFACE_HIGH / SURFACE_HALF_HIGH / DOUBLE_SURFACE) when the edge has a walkable opening. |
| `sockets.bottom` | Same as top — SOLID, EMPTY, or LADDER. Never a surface socket. |
| `sockets.left` | Same as right — SOLID, EMPTY, or a surface socket. |
| `weight` | Default 5. Higher (10-50) for tiles that should appear often, lower (0.1-2) for rare tiles. |
| `density` | From analysis output, but minimum 0.2 for any non-empty tile. Use `max(0.2, analysisValue)` unless the tile is fully transparent. |
| `avoidEdge` | Default: omit (allowed everywhere). Set if tile shouldn't be on specific map edges. |
| `avoidSockets` | Default: omit. Set if tile should avoid specific socket types in a direction. |
| `mandatoryNeighbors` | Default: omit. Set if a specific tile MUST be placed next to this one in a direction. |

**Surface sockets — meaning (left/right edges ONLY):**

A surface socket marks where a character can walk along the edge. It encodes two things: the **height of the walkable surface** (the top of a solid region, where solid below meets empty above) and **what fills the half away from that surface** (open air vs solid).

Low surfaces (walkable near the **bottom**):
- `SURFACE_LOW` — low floor, **open above** (top half empty). A plain ground ledge.
- `SURFACE_HALF_LOW` — low floor, **solid roof above** (top half solid). A roofed/tunnel floor.

High surfaces (walkable near the **middle**):
- `SURFACE_HIGH` — mid ledge, **empty below** (a thin floating ledge).
- `SURFACE_HALF_HIGH` — mid surface, **solid below** (a plateau / solid mass you stand on top of).

Other:
- `DOUBLE_SURFACE` — **two** walkable surfaces, one near the bottom AND one near the middle (two separate solid regions), open above.
- `SOLID` — edge fully filled, no walkable opening.
- `EMPTY` — edge fully clear.

**Connectivity rules (why the socket choice matters):** surfaces connect when their walkable **heights** match. The open vs covered/filled variant determines the strength:
- Same socket (e.g. `SURFACE_HALF_LOW` ↔ `SURFACE_HALF_LOW`) is the strongest — a roofed tunnel or a plateau continues cleanly.
- Open ↔ its covered/filled twin connects more weakly (a tunnel mouth opening to sky, or a plateau meeting a thin ledge): `SURFACE_LOW` ↔ `SURFACE_HALF_LOW`, `SURFACE_HIGH` ↔ `SURFACE_HALF_HIGH`.
- `DOUBLE_SURFACE` connects strongly to the plain `SURFACE_LOW` / `SURFACE_HIGH` (shared open surface) and weakly to the HALF variants.
- Different heights do **NOT** connect (`LOW`/`HALF_LOW` family vs `HIGH`/`HALF_HIGH` family) — the surfaces wouldn't line up.

So pick the socket that reflects both the surface **height** and whether the other half is **solid or open** — not just "it's mixed".

**Detection hints from the analysis script** (visual inspection is authoritative — verify against the image): the `suggestion` field already distinguishes all of these (`SURFACE_LOW`/`HALF_LOW`/`HIGH`/`HALF_HIGH`/`DOUBLE_SURFACE`). Sanity-check it against the picture:
- Solid roof on top + a floor line at the bottom → `SURFACE_HALF_LOW`.
- Mid surface with solid filling all the way down → `SURFACE_HALF_HIGH`; a thin mid ledge with empty below → `SURFACE_HIGH`.
- Two separate ledges (low + mid), open above → `DOUBLE_SURFACE`.
- A top/bottom edge that is partially filled comes back as `UNKNOWN` (surfaces are left/right only) — resolve it to SOLID, EMPTY, or LADDER yourself.

**Surface sockets never appear on top or bottom edges.** Top/bottom are only SOLID, EMPTY, or LADDER.

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

| Socket | Meaning | Allowed edges |
|--------|---------|---------------|
| SOLID | Entire edge is filled (black) | any |
| EMPTY | Entire edge is clear (transparent) | any |
| SURFACE_LOW | Walkable surface near the **bottom**, open above | left/right only |
| SURFACE_HALF_LOW | Low walkable surface with a **solid roof above** (roofed/tunnel floor) | left/right only |
| SURFACE_HIGH | Thin walkable ledge near the **middle**, empty below | left/right only |
| SURFACE_HALF_HIGH | Mid walkable surface with **solid below** (plateau) | left/right only |
| DOUBLE_SURFACE | Walkable surfaces both near the bottom **and** near the middle, open above | left/right only |
| LADDER | Ladder opening — only on top/bottom sockets | top/bottom only |

**Surface connectivity:** surfaces connect only when their walkable **heights** match. Within a height, the same socket connects most strongly; the open variant connects weakly to its covered/filled twin (`SURFACE_LOW`↔`SURFACE_HALF_LOW`, `SURFACE_HIGH`↔`SURFACE_HALF_HIGH`). `DOUBLE_SURFACE` connects strongly to plain `SURFACE_LOW`/`SURFACE_HIGH` and weakly to the HALF variants. The low family (`SURFACE_LOW`, `SURFACE_HALF_LOW`) and the high family (`SURFACE_HIGH`, `SURFACE_HALF_HIGH`) do **not** connect to each other.
