# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sorcerers is a worms-inspired turn-based multiplayer browser game with a magic theme. It supports local multiplayer and peer-to-peer connections via PeerJS/Firebase. Includes a map builder for custom maps. Licensed under GPL-3.0.

## Commands

- `yarn dev` — Start dev server at http://localhost:3000
- `yarn build` — Production build
- `yarn test` — Run tests (Vitest with jsdom)
- `yarn test src/data/collision/__spec__/body.spec.ts` — Run a single test file
- `yarn check-types` — Type check with vue-tsc
- `yarn atlas-packer` — Generate sprite atlases (runs automatically on `yarn install`)
- `yarn sound-compresser` — Compress audio files

## Architecture

**Framework**: Vue 3 (Composition API with `<script setup>`) + Vue Router (hash-based) + Pixi.js for rendering.

**Key layers**:

- **`src/components/`** — Vue UI using atomic design (atoms → molecules → organisms → pages). Pages map to routes: MainMenu, Host, Join, Game, Builder, Spellbook, Settings, Credits.
- **`src/data/`** — All game logic, no rendering concerns:
  - `entity/` — Character (core gameplay class), items, giblets
  - `spells/` — 30+ spell implementations with element types, costs, and targeting. `index.ts` is the master spell registry.
  - `collision/` — Custom physics engine (framerate-agnostic, tested at 15-240 fps). Body types: Body, SimpleBody, StickyBody, StaticBody. Uses collision masks.
  - `network/` — P2P multiplayer via PeerJS with Firebase for lobby discovery. Server/client architecture with state sync.
  - `map/` — Level, terrain, viewport, killbox definitions
  - `controller/` — Input abstraction (KeyboardController, NetworkController)
  - `damage/` — Explosive, impact, fall, and generic damage with target/force calculations
- **`src/graphics/`** — Pixi.js rendering: cursors (spell targeting), particles (factory pattern), animations, visual effects
- **`src/sound/`** — Audio via @pixi/sound
- **`src/util/`** — Helpers, asset loading (singleton AssetsContainer), localStorage settings, Firebase config, math utilities

**`scripts/`** — Build-time tools for atlas packing and sound compression.

## Testing

Tests live in `__spec__/` directories next to source files. Vitest globals are enabled (no imports needed for `describe`, `it`, `expect`). The jsdom environment is used. Physics tests verify framerate-agnostic behavior across multiple tick rates.

## E2E Testing

See [docs/e2e-testing.md](docs/e2e-testing.md) for interactive Playwright MCP testing recipes (hosting a game, casting spells, P2P networking).

## Tech Stack

TypeScript (strict), Vite, Vue 3, Pixi.js, PeerJS, Firebase, SCSS, Vitest.
