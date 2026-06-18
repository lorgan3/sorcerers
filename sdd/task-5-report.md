# Task 5 Report: Generate New Walkable Variety Tiles

## Generator Code Summary

`scripts/generateTiles.ts` uses jimp to produce three 80×80 PNG tiles, all black-opaque or fully transparent:

- **steepCliffRamp**: Triangle solid. Predicate `y >= 28 - (28 * x) / SIZE` → large solid wedge, small air triangle in the top-left. Hypotenuse from top-left (0, 28) up to top-right (80, 0).
- **highCeilingRamp**: Inverted triangle. Predicate `y <= (52 * x) / SIZE` → solid wedge in top-right, air in lower-left. Hypotenuse from top-left (0, 0) down to bottom-right (80, 52).
- **doubleLedge**: Two separate solid strips. Bottom floor: `y >= 64`. Mid-left ledge: `x < 40 && y >= 40 && y < 48`.

Type fix applied: `Jimp` cannot be used as a type in function parameters with this jimp version — changed to `InstanceType<typeof Jimp>`.

## Per-Tile Analysis

### steepCliffRamp
- **Measured density**: 0.817
- **Analyzer socket suggestions**: top EMPTY, right SOLID, bottom SOLID, left SURFACE_LOW
- **Visually-confirmed sockets**: `top EMPTY, right SOLID, bottom SOLID, left SURFACE_HIGH`
- **Visual description**: Large black triangle occupying most of the tile. Small air triangle in the top-left corner. The diagonal cut runs from the left edge at y≈28 (35% from top) up to the top-right corner. The walkable surface on the left edge begins at 35% from the top — mid-tile → SURFACE_HIGH. The analyzer suggested SURFACE_LOW because solidCenter > 0.5, but the transition point at y=28 places the surface in the upper half of the tile, matching SURFACE_HIGH semantics.
- **Predicate adjustments**: None — shape matches intended role on first run.

### highCeilingRamp
- **Measured density**: 0.328
- **Analyzer socket suggestions**: top SOLID, right SURFACE_HIGH, bottom EMPTY, left EMPTY
- **Visually-confirmed sockets**: `top SOLID, right SOLID, bottom EMPTY, left EMPTY`
- **Visual description**: Mostly white (air) tile with a black triangle in the top-right corner. The right edge has solid from y=0 to y=52 (65% coverage). This is a ceiling piece — no walkable floor surfaces anywhere. The analyzer suggested SURFACE_HIGH for the right edge because 65% is partially solid, but per the brief and the existing `ceilingRamp` tile pattern, this is SOLID (the partial coverage doesn't imply a floor surface — it's the underside of a ceiling ramp). Visual confirms: the shape reads as a ceiling overhang, not a walkable ramp.
- **Predicate adjustments**: None.

### doubleLedge
- **Measured density**: 0.25
- **Analyzer socket suggestions**: top EMPTY, right SURFACE_LOW, bottom SOLID, left DOUBLE_SURFACE
- **Visually-confirmed sockets**: `top EMPTY, right SURFACE_LOW, bottom SOLID, left DOUBLE_SURFACE`
- **Visual description**: Mostly white (air) tile with two thin horizontal black strips. The bottom strip (y 64–79) spans the full width — the low floor. A slightly thicker black strip (y 40–47) on the left half only — the mid ledge. The left edge shows two separate solid regions (the ledge + floor), confirming DOUBLE_SURFACE. The right edge shows only the bottom floor strip, confirming SURFACE_LOW. Analyzer and visual are in full agreement.
- **Predicate adjustments**: None.

## TDD Evidence

**RED phase**: Added 4 tests under `describe("new variety tiles", ...)` before registering tiles in tiles.ts. All 4 failed:
- `steepCliffRamp exists and sits in the mid-high band` → t undefined
- `highCeilingRamp is a ceiling (no surface sockets, air below)` → t undefined
- `doubleLedge has a DOUBLE_SURFACE edge` → t undefined
- `new tiles produce mirrors where asymmetric` → undefined not truthy

**GREEN phase**: After adding imports and BASE_TILES entries to tiles.ts, all 30 tests pass (26 pre-existing + 4 new).

`yarn check-types` passes with no errors.

## Files Changed

- `scripts/generateTiles.ts` — created
- `src/data/wfc/tiles/steepCliffRamp.png` — generated (80×80, density 0.817)
- `src/data/wfc/tiles/highCeilingRamp.png` — generated (80×80, density 0.328)
- `src/data/wfc/tiles/doubleLedge.png` — generated (80×80, density 0.25)
- `src/data/wfc/tiles.ts` — added 3 imports + 3 BASE_TILES entries
- `src/data/wfc/__spec__/tiles.spec.ts` — added `describe("new variety tiles", ...)` block

## Self-Review

All three tiles satisfy the design principles:
1. **Walkable, connected terrain**: All empty space connects to a tile edge — no enclosed caverns.
2. **Socket rules**: top/bottom only use SOLID/EMPTY; left/right use surface sockets where appropriate.
3. **Asymmetric tiles get mirrors**: steepCliffRamp (left≠right) and doubleLedge (left≠right) produce _m variants; highCeilingRamp (left=EMPTY, right=SOLID, asymmetric) also produces a _m variant.

## Concerns

One visual/analyzer divergence to flag for the human reviewer:

- **steepCliffRamp left socket**: The analyzer suggested SURFACE_LOW (solidCenter = 0.677, meaning the centroid of solid pixels on the left edge is 67.7% from the top). I assigned SURFACE_HIGH because the transition point (where air becomes solid) is at y=28 (35% from top), which is in the upper half of the tile. The brief explicitly calls for SURFACE_HIGH here. A human reviewer should confirm the left edge reads as a mid-height floor, not a low floor.

- **highCeilingRamp right socket**: Analyzer suggests SURFACE_HIGH (only 65% solid coverage on the right edge). I assigned SOLID per the brief and matching the existing `ceilingRamp` tile's convention. Human reviewer should confirm this reads as a ceiling, not a walkable ramp face.

## Fix: re-tune steepCliffRamp + highCeilingRamp

### steepCliffRamp

- **Predicate used**: `y >= 40 - (40 * x) / SIZE`
- **Measured density**: 0.744
- **Analyzer socket suggestions**: top EMPTY, right SOLID (0.9875), bottom SOLID (1.0), left SURFACE_LOW (solidRatio 0.5, solidCenter 0.753)
- **Visually-confirmed sockets**: `top EMPTY, right SOLID, bottom SOLID, left SURFACE_HIGH`
- **Final shape**: Clear diagonal slope — air occupies the upper-left triangle (from top-left corner to left-edge y=40), solid fills the lower-right. The left edge is exactly half-solid (y=40..79), with the walkable surface starting at mid-tile height. The analyzer suggests SURFACE_LOW because solidCenter > 0.6 (the solid mass is biased toward the bottom half), but the floor transition is at y=40 (exactly middle), matching SURFACE_HIGH semantics per the design rules. Right edge: 79/80 pixels solid (98.75%) → SOLID. Previous version had the hypotenuse at y=28 making it nearly all solid (density 0.817); the new predicate opens up much more air, reads as a true diagonal slope.

### highCeilingRamp

- **Predicate used**: `y <= (SIZE - 1) * Math.pow(x / SIZE, 0.7)`
- **Measured density**: 0.58
- **Analyzer socket suggestions**: top SOLID (1.0), right SOLID (0.9875), bottom EMPTY (0.0), left EMPTY (0.0125)
- **Visually-confirmed sockets**: `top SOLID, right SOLID, bottom EMPTY, left EMPTY`
- **Final shape**: Thick curved overhang. The solid region fills the top-right with a concave air boundary (the curve bows toward the upper-right, making the solid wedge fatter than a straight-line diagonal). Left edge has only 1 solid pixel (y=0, the top-left corner) → 1.25% → EMPTY ✓. Bottom edge is entirely air → EMPTY ✓. Right edge: 79/80 pixels solid → SOLID ✓. Top edge: all solid → SOLID ✓. Density 0.58 exceeds ceilingRamp (0.506) while keeping all four sockets valid.
- **Density achieved**: 0.58. No cap hit — all four sockets read cleanly. The curved (power-law) boundary was the key: a straight diagonal tops out near 0.49; the p=0.7 exponent adds ~0.09 extra density while the left/bottom edge constraints remain satisfied (left stays at 1 pixel solid, bottom stays at 0 solid).

### Test run

```
yarn test src/data/wfc/__spec__/tiles.spec.ts
```

Output: **30 tests passed** (all pre-existing + Task-5 tests). `yarn check-types` also passes cleanly.
