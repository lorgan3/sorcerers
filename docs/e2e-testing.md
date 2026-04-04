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
10. Play turns: move with A/D/W keys, right-click to open spell book, select a spell by bounding box click, aim and hold left-click to cast (use `browser_run_code` to batch the sequence)

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

### Spell inventory layout
The inventory grid has two sections, both sorted by mana cost:
- **Support spells (indices 0-3):** Shield(8), Rock(12), MindControl(14), Wings(16)
- **Offense spells (indices 4-23):** Melee(0), Ignis(6), WindBlast(10), IceWall(10), Blink(12), Nephtear(14), Babylon(16), Acid(18), Teleport(20), FireWheel(22), Lightning(24), Daosdorg(26), Hairpin(28), Excalibur(30), Doragate(32), Vollzanbel(33), Catastravia(36), Zoltraak(40), Meteor(50), Bakuretsu(70)

### Spell cursor types
Different spells use different targeting cursors:
- **PoweredArcaneCircle** (Ignis, Nephtear, WindBlast, etc.): Directional — aim with mouse position relative to character, **hold left-click** to charge and fire. The longer you hold, the more power.
- **ArrowDown** (Excalibur, Babylon, Bakuretsu): Global targeting — a down-arrow cursor follows the mouse. **Single click** at the target position to drop the spell there. Easiest to test.
- **ArcaneCircle** (Shield, IceWall, Lightning, etc.): Directional — aim with mouse, **single click** to fire.
- **Lock** (Meteor, Teleport): Click on a target (character or position). **Single click** to activate.
- **ApplyCursor** (Melee, Wings, Blink): Triggered by pressing a key (usually M1/left-click). **Single click** to use.

### Spell casting flow
1. **Open spell book:** Right-click the canvas via `page.mouse.click(x, y, { button: 'right' })`. This toggles the inventory panel.
2. **Wait for inventory:** `.wrapper.isOpen` appears.
3. **Select a spell:** You **must use bounding box coordinates** to click spell slots — Playwright's actionability check fails because the inventory uses `overflow: clip` with CSS transforms. Use this pattern:
   ```js
   const slot = page.locator('.inventory .grid .slot').nth(INDEX);
   const box = await slot.boundingBox();
   await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
   ```
   Inventory closes and a targeting cursor activates.
4. **Cast the spell — depends on cursor type:**
   - **ArrowDown spells (recommended for testing):** Move mouse to target position with `page.mouse.move(x, y)`, then `page.mouse.down()` + brief wait + `page.mouse.up()`.
   - **PoweredArcaneCircle spells:** Move mouse away from character in aim direction, then `page.mouse.down()`, wait 500-1500ms to charge, `page.mouse.up()` to release.
   - **Other cursors:** Generally single click at target.

### Simulating held clicks in Playwright MCP
Use `browser_run_code` with Playwright's mouse API:
```js
async (page) => {
  await page.mouse.move(targetX, targetY);
  await page.mouse.down();
  await page.waitForTimeout(1000); // hold to charge
  await page.mouse.up();
}
```
**Important:** `page.mouse.click()` works for ArrowDown spells but not for PoweredArcaneCircle spells that need sustained input. Always prefer `mouse.down()` + wait + `mouse.up()`.

### Aiming tips
- For aimed spells, position the mouse **away from the character** in the direction you want to fire (e.g., mouse to the right of the character to shoot right)
- Use `browser_take_screenshot` to visually locate characters on the canvas — the accessibility snapshot won't show canvas-rendered characters
- For global/ArrowDown spells (Excalibur, Babylon, Bakuretsu), the mouse position determines where the spell lands — aim directly at the enemy
- **Camera follows the active character.** The enemy may be off-screen. Use Ctrl + mouse to pan the camera and locate them before casting.

### Practical spell testing approach
1. **Start with ArrowDown spells** (Babylon cost 16, Excalibur cost 30, or Bakuretsu cost 70) — they just need a click at the target position, no aiming direction needed
2. Then try a **PoweredArcaneCircle spell** (Ignis cost 6) with the mouse positioned away from the character and a held click
3. **Batch the full sequence in one `browser_run_code` call** to avoid running out of turn time:
   ```js
   async (page) => {
     // Open inventory
     await page.mouse.click(600, 400, { button: 'right' });
     await page.waitForTimeout(400);
     // Select spell by bounding box
     const slot = page.locator('.inventory .grid .slot').nth(10); // Babylon
     const box = await slot.boundingBox();
     await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
     await page.waitForTimeout(300);
     // Aim and fire
     await page.mouse.move(targetX, targetY);
     await page.mouse.down();
     await page.waitForTimeout(100);
     await page.mouse.up();
   }
   ```

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

## 6. Game Over Screen

When the last team standing wins (or sudden death resolves), a "Game over!" dialog appears showing:
- Player rankings (1st place, 2nd place, etc.)
- Efficiency grades (A, B, C, etc.)
- Stat summary text (e.g., "Player was a punching bag")
- "Main menu" button to return to `/#/`

**Sudden death:** When the game clock hits 00:00, the water level rises (terrain floods from the bottom). Characters standing in the rising water take damage and eventually die.

---

## 7. Gotchas & Tips

**Asset loading:** The game uses a singleton `AssetsContainer` that loads sprite atlases. Nothing works until `onComplete` fires. Always wait for `.hud` after navigating to the game route.

**Inventory overflow: clip issue:** The inventory panel uses `overflow: clip` with CSS transforms. Playwright's default actionability checks will fail with "element is outside of the viewport" when trying to click spell slots via locators. **Always use bounding box coordinates** instead of `locator.click()`:
```js
const box = await slot.boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
```

**Canvas vs DOM:** Character positions, spell effects, and terrain are rendered in the Pixi.js canvas — they are **not DOM elements** and won't appear in `browser_snapshot`. Use `browser_take_screenshot` to visually inspect the game state. The HUD, inventory, and popups are Vue DOM overlays and do appear in snapshots.

**Turn timing is tight:** Even 30s turns go fast when automating through Playwright. Batch the full open-inventory → select-spell → aim → cast sequence in a single `browser_run_code` call to avoid timeout. Setting turn duration to 45s (default) gives more breathing room.

**Camera follows active character:** The enemy may be off-screen. Use Ctrl + mouse to pan and locate them. After casting, the camera may snap to the projectile or impact location.

**Inventory polling:** The inventory component polls every 1000ms to update spell availability. After a turn starts, there may be up to 1s before spell lock states are accurate.

**Mana budget:** At default mana multiplier (100%), mana is limited. At 2500%, you get 500 mana per turn — enough for any spell including Bakuretsu (70). Use high mana for testing spell mechanics; use default mana to test the mana system itself.

**Sound:** The game plays music and SFX. Set volumes to 0 in localStorage to avoid noise during testing. Browsers may show autoplay warnings — not a blocker for Playwright.

**Map consistency:** Pick the same map each time for reproducible tests. Default maps are available in the host page dropdown. "Playground" is the default.
