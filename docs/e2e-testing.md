# E2E Testing with Playwright MCP

Interactive reference for driving the Sorcerers game through Playwright MCP tool calls. Organized by concept so Claude (or a human) can adapt to the current situation rather than follow a brittle script.

## Quick Start: Local Game in 30 Seconds

1. Ensure `yarn dev` is running (`localhost:3000`)
2. `browser_navigate` to `http://localhost:3000`
3. Seed localStorage via `browser_evaluate`:
   ```js
   const existing = JSON.parse(localStorage.getItem("Settings") || "{}");
   localStorage.setItem("Settings", JSON.stringify({ ...existing, tutorialDone: true }));
   ```
4. Reload the page to pick up settings
5. Click "Host" to go to `/#/host`
6. Add a local player (plus icon next to "Players")
7. Optionally edit settings: team size 1, turn duration 15s, mana multiplier 2500%
8. Click "Start"
9. Wait for `.hud` to appear (game is ready)
10. Play turns: move with A/D/W keys, right-click to open spell book, select a spell, hold left-click to cast

---

## 1. Prerequisites & Setup

### Dev server
The game must be running at `localhost:3000` via `yarn dev`.

### localStorage seeding
The app stores all settings under a single `"Settings"` localStorage key as JSON. The critical field is `tutorialDone` — when `false` (the default), a multi-step tutorial overlay blocks gameplay.

**Always run this before testing:**
```js
// Via browser_evaluate after navigating to localhost:3000
const existing = JSON.parse(localStorage.getItem("Settings") || "{}");
localStorage.setItem("Settings", JSON.stringify({ ...existing, tutorialDone: true }));
```

Then reload or navigate to ensure the app picks up the change.

**Optional:** You can also preset the player name, volumes, and game settings in the same object:
```js
localStorage.setItem("Settings", JSON.stringify({
  ...existing,
  tutorialDone: true,
  name: "TestPlayer",
  sfxVolume: 0,
  musicVolume: 0,
  gameSettings: {
    teamSize: 1,
    turnLength: 15,
    gameLength: 10,
    manaMultiplier: 2500,
    itemSpawnChance: 100,
    trustClient: false
  }
}));
```

---

## 2. Navigation & Hosting a Local Game

### Route flow
`/#/` (MainMenu) → `/#/host` (Host lobby) → `/#/game/:id` (Game)

### Main menu selectors
- **Host:** `getByRole('link', { name: /^Host$/ })` — routes to `/#/host`
- **Join game:** `getByRole('button', { name: /^Join game$/ })` — opens join dialog
- **Settings:** RouterLink in bottom-left (`.book-link`)

### Host page setup
1. A room code is auto-generated (visible in `.key` span)
2. One player (the host) is already present
3. **Add local player:** Click the plus icon button next to the "Players" heading
4. **Map selection:** `<select>` dropdown in the `MapSelect` component. Default maps are available. Pick the same map each time for consistency.
5. **Edit game settings:** Click the edit icon next to "Settings" heading. Key fields:
   - Team size (`label="Team size"`) — set to 1 for faster testing
   - Turn duration (`label="Turn duration (seconds)"`) — 15s is good for testing
   - Mana multiplier (`label="Mana gain multiplier (pct)"`) — 2500% lets you cast expensive spells freely
6. **Start game:** Click the "Start" button (`.primary` class)

### Waiting for game ready
After clicking Start, the route changes to `/#/game/:id`. The Pixi.js canvas (`div.render-target`) mounts immediately but the game needs time to load assets and initialize. **Wait for the `.hud` element to appear** — this signals the game is fully loaded and playable.

---

## 3. Gameplay — Moving, Casting Spells, and Turns

### Turn structure
The game cycles through players. A popup (`.popup`) announces whose turn it is. The active player can move their character and cast spells until the turn timer expires or they attack.

### Movement controls
- `A` — move left
- `D` — move right
- `W` — jump
- Use `browser_press_key` for these

### Spell casting flow
1. **Open spell book:** Right-click the canvas (`browser_click` with `button: "right"`). This toggles the inventory panel.
2. **Wait for inventory:** `.wrapper.isOpen` appears
3. **Select a spell:** Click a non-locked spell slot in the grid (`.grid .slot:not(.locked)`). The grid has two sections: "Support" (stacking/utility spells) and "Offense" (damage spells). Inventory closes and a targeting cursor activates.
4. **Cast the spell — depends on range:**
   - **Directional/ranged spells** (most offensive spells): Mouse position relative to the active character determines aim direction. **Hold left-click** (mousedown → wait ~500ms → mouseup) — most spells require a sustained press to charge and fire.
   - **Global spells** (no range / infinite): Can be cast at any position on the map. Hold click anywhere on the canvas.
5. **Release mouse** to complete the cast.

### Simulating held clicks in Playwright MCP
A simple `browser_click` won't work for most spells. You need to simulate a held mouse button. Options:
- Use `browser_evaluate` to dispatch `mousedown`, wait, then `mouseup` events on the canvas
- Use `browser_run_code` with Playwright's `page.mouse.down()`, `page.waitForTimeout(500)`, `page.mouse.up()` pattern

### Aiming tips
- For aimed spells, position the mouse **away from the character** in the direction you want to fire (e.g., mouse to the right of the character to shoot right)
- Use `browser_snapshot` to visually locate the character before aiming
- For global spells, click position doesn't affect direction — just hold anywhere

### Practical spell testing approach
1. Start with a **support/global spell** (no aiming needed) to verify the select → cast flow works
2. Then try a **directional offensive spell** with the mouse positioned away from the character

---

## 4. Reading Game State from the HUD

The HUD (`.hud`, bottom-left) exposes key game state as readable DOM elements. Use these to assert correctness and make decisions during testing.

| Element | Selector | What it shows |
|---------|----------|---------------|
| Turn timer | `.timer.socket` | Seconds remaining in current turn. Flashes red at <10s. |
| Game clock | `.clock.socket` | Elapsed game time in `MM:SS` format. |
| Mana bar | `.mana.socket` | Current mana — visual bar + numeric value. |
| Player list | `.players` | All players with names. Active player is bold with glow. |
| HP bars | `.hp` elements | Per-character health bars, color-coded by player. |
| Element indicators | `.elements.socket` | Four element icons (Physical, Elemental, Arcane, Life) with variable opacity. |

### What to assert
- **After casting a spell:** Read `.mana.socket` to verify mana was deducted
- **After a damaging spell hits:** Read opponent's `.hp` elements to verify damage
- **Turn state:** Read `.timer.socket` to decide if there's time to act. Check which player name is bold in `.players` to confirm whose turn it is
- **Between turns:** Watch for `.popup` announcing the next player's turn

---

## 5. Two-Tab P2P Networking

Use this when testing network sync, lobby discovery, or client-server message flow specifically.

### How P2P works
The host creates a PeerJS peer. The joining client connects using the room code. Firebase handles lobby discovery; actual gameplay data flows peer-to-peer.

### Flow
1. **Tab 1 (Host):** Navigate to `localhost:3000`, seed localStorage (tutorialDone), go to `/#/host`. Read the room code from the `.key` span.
2. **Tab 2 (Client):** Open a new tab via `browser_navigate` to `localhost:3000`. Seed localStorage here too. Click "Join game" on the main menu. Enter the room code in the "Room code" input (`getByLabel('Room code')`). Click "Connect" (`getByRole('button', { name: /^Connect$/ })`).
3. **Back to Tab 1:** The host page should now show the remote player in the players list. Wait for the player to appear before proceeding. Click "Start".
4. **Both tabs** transition to `/#/game/:id`.

### Tab management
- Use `browser_tabs` to list open tabs and switch between them
- Seed localStorage with `tutorialDone: true` in **both** tabs
- Wait for `.hud` in each tab after game starts to confirm both loaded

### Timing concerns
- PeerJS connection takes a moment after clicking Connect — wait for the player to appear in the host's player list before clicking Start
- Both tabs load assets independently
- Network sync means actions in one tab should be reflected in the other after a brief delay

### What to test
- Player appears in lobby after joining
- Both tabs load into the game successfully
- Turn state is synchronized (same active player in both tabs)
- Damage/HP changes propagate to both clients

---

## 6. Gotchas & Tips

**Asset loading:** The game uses a singleton `AssetsContainer` that loads sprite atlases. Nothing works until `onComplete` fires. Always wait for `.hud` after navigating to the game route.

**Canvas coordinates:** The Pixi.js canvas fills the viewport. For aimed spells, character position on screen matters — click relative to where the character is. Use `browser_snapshot` to visually locate characters.

**Inventory polling:** The inventory component polls every 1000ms to update spell availability. After a turn starts, there may be up to 1s before spell lock states are accurate.

**Turn timer:** If set low (15s), the timer flashes red at <10s and the turn auto-ends. Cast spells before time runs out.

**Mana budget:** At default mana multiplier (100%), mana is limited. At 2500%, you can cast freely. Use high mana for testing spell mechanics; use default mana to test the mana system itself.

**Sound:** The game plays music and SFX. Set volumes to 0 in localStorage to avoid noise during testing. Browsers may show autoplay warnings — not a blocker for Playwright.

**Map consistency:** Pick the same map each time for reproducible tests. Default maps are available in the host page dropdown.
